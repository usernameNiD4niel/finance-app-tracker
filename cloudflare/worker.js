// ============================================================
// Cloudflare Worker — Lemon Squeezy + Firestore backend
// Handles 3 routes:
//   POST /api/create-checkout
//   POST /api/webhook
//   GET  /api/subscription-status/:userId
//
// Required secrets (set in Cloudflare Dashboard → Settings → Variables):
//   LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_WEBHOOK_SECRET
//   LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_ID
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// ============================================================

// ── Lemon Squeezy helpers ────────────────────────────────────

async function lsRequest(env, method, path, body) {
  const res = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Lemon Squeezy webhook signature verification ─────────────
// LS signs the raw body with HMAC-SHA256 and puts the hex digest in X-Signature.

async function verifyLSSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) throw new Error('Missing X-Signature header');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedSig = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedSig !== signatureHeader) throw new Error('Signature mismatch');
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

// ── Route: POST /api/create-checkout ─────────────────────────

async function handleCreateCheckout(req, env) {
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

  const result = await lsRequest(env, 'POST', '/checkouts', {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email,
          custom: { userId },
        },
        product_options: {
          redirect_url: 'ledgerist://payment-success',
        },
      },
      relationships: {
        store: {
          data: { type: 'stores', id: String(env.LEMONSQUEEZY_STORE_ID) },
        },
        variant: {
          data: { type: 'variants', id: String(env.LEMONSQUEEZY_VARIANT_ID) },
        },
      },
    },
  });

  if (result.errors) {
    const msg = result.errors[0]?.detail ?? 'Lemon Squeezy error';
    return Response.json({ error: msg }, { status: 502 });
  }

  const checkoutUrl = result.data?.attributes?.url;
  if (!checkoutUrl) {
    return Response.json({ error: 'No checkout URL returned' }, { status: 502 });
  }

  return Response.json({ checkoutUrl });
}

// ── Route: POST /api/webhook ──────────────────────────────────

async function handleWebhook(req, env) {
  const rawBody = await req.text();
  // Cloudflare Workers normalise headers to lowercase
  const sig = req.headers.get('x-signature') ?? '';

  try {
    await verifyLSSignature(rawBody, sig, env.LEMONSQUEEZY_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventName = event.meta?.event_name;
  const userId = event.meta?.custom_data?.userId;
  const attrs = event.data?.attributes;

  if (!userId) {
    // No userId means we cannot update the right Firestore document.
    // Return 200 so Lemon Squeezy does not keep retrying.
    console.error('[webhook] No userId in meta.custom_data');
    return Response.json({ received: true });
  }

  try {
    switch (eventName) {
      case 'subscription_created': {
        const lsCustomerId = String(attrs.customer_id);
        const subscriptionId = String(event.data.id);
        await firestoreMerge(env, userId, {
          isPremium: attrs.status === 'active',
          subscriptionStatus: attrs.status,
          lsCustomerId,
          subscriptionId,
        });
        break;
      }
      case 'subscription_updated': {
        const isActive = attrs.status === 'active';
        await firestoreMerge(env, userId, {
          isPremium: isActive,
          subscriptionStatus: attrs.status,
        });
        break;
      }
      case 'subscription_cancelled':
      case 'subscription_expired': {
        await firestoreMerge(env, userId, {
          isPremium: false,
          subscriptionStatus: attrs.status ?? eventName.replace('subscription_', ''),
        });
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
  'Access-Control-Allow-Headers': 'Content-Type',
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
      if (method === 'POST' && pathname === '/api/create-checkout') {
        return withCors(await handleCreateCheckout(request, env));
      }

      // Webhook does NOT need CORS — called by Lemon Squeezy server-to-server
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
