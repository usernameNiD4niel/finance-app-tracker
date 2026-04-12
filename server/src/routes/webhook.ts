import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../firebase-admin';

const router = Router();

function verifyLSSignature(rawBody: string, signatureHeader: string, secret: string): void {
  if (!signatureHeader) throw new Error('Missing X-Signature header');
  const computedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  if (computedSig !== signatureHeader) throw new Error('Signature mismatch');
}

router.post('/', async (req: Request, res: Response) => {
  const sig = (req.headers['x-signature'] as string) ?? '';
  const rawBody = req.body as Buffer;

  try {
    verifyLSSignature(rawBody.toString(), sig, process.env.LEMONSQUEEZY_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const event = JSON.parse(rawBody.toString());
  const eventName: string = event.meta?.event_name;
  const userId: string | undefined = event.meta?.custom_data?.userId;
  const attrs = event.data?.attributes;

  if (!userId) {
    console.error('[webhook] No userId in meta.custom_data');
    return res.json({ received: true });
  }

  const profileRef = db.collection('users').doc(userId).collection('profile').doc('subscription');

  try {
    switch (eventName) {
      case 'subscription_created': {
        const lsCustomerId = String(attrs.customer_id);
        const subscriptionId = String(event.data.id);
        await profileRef.set(
          {
            isPremium: attrs.status === 'active',
            subscriptionStatus: attrs.status,
            lsCustomerId,
            subscriptionId,
          },
          { merge: true }
        );
        break;
      }
      case 'subscription_updated': {
        await profileRef.set(
          { isPremium: attrs.status === 'active', subscriptionStatus: attrs.status },
          { merge: true }
        );
        break;
      }
      case 'subscription_cancelled':
      case 'subscription_expired': {
        await profileRef.set(
          {
            isPremium: false,
            subscriptionStatus: attrs.status ?? eventName.replace('subscription_', ''),
          },
          { merge: true }
        );
        break;
      }
      default:
        break;
    }
  } catch (err: any) {
    console.error('[webhook] Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  return res.json({ received: true });
});

export default router;
