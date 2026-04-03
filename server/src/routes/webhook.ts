import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../firebase-admin';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const getProfileRef = async (customerId: string) => {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const userId = customer.metadata?.userId;
    if (!userId) throw new Error(`No userId in customer metadata for ${customerId}`);
    return db.collection('users').doc(userId).collection('profile').doc('subscription');
  };

  try {
    switch (event.type) {
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const ref = await getProfileRef(sub.customer as string);
        await ref.set(
          { isPremium: sub.status === 'active', subscriptionStatus: sub.status },
          { merge: true }
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const ref = await getProfileRef(sub.customer as string);
        await ref.set({ isPremium: false, subscriptionStatus: 'canceled' }, { merge: true });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const ref = await getProfileRef(invoice.customer as string);
        await ref.set({ isPremium: false, subscriptionStatus: 'past_due' }, { merge: true });
        break;
      }
    }
  } catch (err: any) {
    console.error('[webhook] Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  return res.json({ received: true });
});

export default router;
