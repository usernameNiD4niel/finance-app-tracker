// ============================================================
// Cloudflare Worker — Stripe + Firestore backend
// Handles 3 routes:
//   POST /api/create-subscription
//   POST /api/webhook
//   GET  /api/subscription-status/:userId
//
// Required secrets (set in Cloudflare Dashboard → Settings → Variables):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// ============================================================

// ── Stripe helpers (pure fetch, no SDK) ──────────────────────

async function stripeRequest(env, method, path, params) {
  const body = params ? buildFormBody(params) : undefined;
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  return res.json();
}

// Builds URL-encoded form body; supports nested keys and arrays
function buildFormBody(params, prefix = '') {
  const parts = [];
  for (const [key, val] of Object.entries(params)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      parts.push(buildFormBody(val, fullKey));
    } else if (Array.isArray(val)) {
      for (const item of val) {
        parts.push(`${encodeURIComponent(fullKey + '[]')}=${encodeURIComponent(item)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(val)}`);
    }
  }
  return parts.join('&');
}

// ── Stripe webhook signature verification ───────────────────

async function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) throw new Error('Missing Stripe-Signature header');

  const parts = sigHeader.split(',');
  const tPart = parts.find(p => p.startsWith('t='));
  const v1Part = parts.find(p => p.startsWith('v1='));
  if (!tPart || !v1Part) throw new Error('Invalid Stripe-Signature header');

  const timestamp = tPart.slice(2);
  const expectedSig = v1Part.slice(3);
  const signedPayload = `${timestamp}.${rawBody}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedSig !== expectedSig) throw new Error('Signature mismatch');

  const tolerance = 300; // 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > tolerance) {
    throw new Error('Timestamp too old');
  }
}

// ── Firebase / Firestore helpers ─────────────────────────────

// Creates a short-lived OAuth2 access token from a service account
async function getFirebaseAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);

  const encode = obj =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const payload = encode({
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore',
  });

  const signingInput = `${header}.${payload}`;

  // Strip PEM headers and decode
  const pem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const pemBody = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${sigB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Firebase token error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

// Firestore document URL for users/{userId}/profile/subscription
function firestoreUrl(projectId, userId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/profile/subscription`;
}

function toFirestoreValue(val) {
  if (typeof val === 'boolean') return { booleanValue: val };
  if (val === null || val === undefined) return { nullValue: null };
  return { stringValue: String(val) };
}

function fromFirestoreValue(fieldObj) {
  if (!fieldObj) return undefined;
  if ('booleanValue' in fieldObj) return fieldObj.booleanValue;
  if ('stringValue' in fieldObj) return fieldObj.stringValue;
  if ('nullValue' in fieldObj) return null;
  return undefined;
}

async function firestoreGet(env, userId) {
  const token = await getFirebaseAccessToken(env);
  const res = await fetch(firestoreUrl(env.FIREBASE_PROJECT_ID, userId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  return res.json();
}

async function firestoreMerge(env, userId, data) {
  const token = await getFirebaseAccessToken(env);
  const fields = {};
  const fieldPaths = Object.keys(data);
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  const maskQuery = fieldPaths
    .map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join('&');
  const url = `${firestoreUrl(env.FIREBASE_PROJECT_ID, userId)}?${maskQuery}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore PATCH failed: ${err}`);
  }
}

// ── Shared: look up userId from a Stripe customerId ──────────

async function getUserIdFromCustomer(env, customerId) {
  const customer = await stripeRequest(env, 'GET', `/customers/${customerId}`, null);
  const userId = customer.metadata?.userId;
  if (!userId) throw new Error(`No userId in Stripe customer metadata for ${customerId}`);
  return userId;
}

// ── Route: POST /api/create-subscription ─────────────────────

async function handleCreateSubscription(req, env) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, email } = body;
  if (!userId || !email) {
    return Response.json({ error: 'userId and email are required' }, { status: 400 });
  }

  // Reuse existing Stripe customer if one was saved to Firestore
  const existingDoc = await firestoreGet(env, userId);
  let customerId = existingDoc?.fields
    ? fromFirestoreValue(existingDoc.fields.stripeCustomerId)
    : undefined;

  if (!customerId) {
    const customer = await stripeRequest(env, 'POST', '/customers', {
      email,
      'metadata[userId]': userId,
    });
    if (customer.error) throw new Error(customer.error.message);
    customerId = customer.id;
  }

  const subscription = await stripeRequest(env, 'POST', '/subscriptions', {
    customer: customerId,
    'items[0][price]': env.STRIPE_PRICE_ID,
    payment_behavior: 'default_incomplete',
    'payment_settings[save_default_payment_method]': 'on_subscription',
    'expand[]': 'latest_invoice.payment_intent',
  });
  if (subscription.error) throw new Error(subscription.error.message);

  const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;
  const subscriptionId = subscription.id;

  await firestoreMerge(env, userId, { stripeCustomerId: customerId, subscriptionId });

  return Response.json({ clientSecret, customerId, subscriptionId });
}

// ── Route: POST /api/webhook ──────────────────────────────────

async function handleWebhook(req, env) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  try {
    await verifyStripeSignature(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  try {
    switch (event.type) {
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = await getUserIdFromCustomer(env, sub.customer);
        await firestoreMerge(env, userId, {
          isPremium: sub.status === 'active',
          subscriptionStatus: sub.status,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = await getUserIdFromCustomer(env, sub.customer);
        await firestoreMerge(env, userId, { isPremium: false, subscriptionStatus: 'canceled' });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const userId = await getUserIdFromCustomer(env, invoice.customer);
        await firestoreMerge(env, userId, { isPremium: false, subscriptionStatus: 'past_due' });
        break;
      }
      default:
        // Ignore unhandled event types
        break;
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }

  return Response.json({ received: true });
}

// ── Route: GET /api/subscription-status/:userId ───────────────

async function handleSubscriptionStatus(env, userId) {
  const doc = await firestoreGet(env, userId);
  if (!doc?.fields) {
    return Response.json({ isPremium: false, subscriptionStatus: null });
  }
  return Response.json({
    isPremium: !!fromFirestoreValue(doc.fields.isPremium),
    subscriptionStatus: fromFirestoreValue(doc.fields.subscriptionStatus) ?? null,
  });
}

// ── Main router ──────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
};

function withCors(res) {
  const newRes = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    newRes.headers.set(k, v);
  }
  return newRes;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      if (method === 'POST' && pathname === '/api/create-subscription') {
        return withCors(await handleCreateSubscription(request, env));
      }

      // Webhook does NOT need CORS — called by Stripe server-to-server
      if (method === 'POST' && pathname === '/api/webhook') {
        return handleWebhook(request, env);
      }

      const statusMatch = pathname.match(/^\/api\/subscription-status\/(.+)$/);
      if (method === 'GET' && statusMatch) {
        return withCors(await handleSubscriptionStatus(env, statusMatch[1]));
      }

      if (pathname === '/health') {
        return Response.json({ ok: true }, { headers: CORS_HEADERS });
      }

      return new Response('Not Found', { status: 404 });
    } catch (err) {
      console.error('[worker]', err.message);
      return Response.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
    }
  },
};
