import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../firebase-admin';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

router.post('/', async (req: Request, res: Response) => {
  const { userId, email } = req.body as { userId: string; email: string };

  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
  }

  try {
    // Reuse existing customer if available
    const profileRef = db.collection('users').doc(userId).collection('profile').doc('subscription');
    const profileSnap = await profileRef.get();
    const existingCustomerId: string | undefined = profileSnap.exists ? profileSnap.data()?.stripeCustomerId : undefined;

    let customerId = existingCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
    }

    // Create subscription in incomplete state — requires payment method confirmation
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.STRIPE_PRICE_ID! }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    // Persist customer + subscription IDs to Firestore
    await profileRef.set(
      { stripeCustomerId: customerId, subscriptionId: subscription.id },
      { merge: true }
    );

    return res.json({
      clientSecret: paymentIntent.client_secret,
      customerId,
      subscriptionId: subscription.id,
    });
  } catch (err: any) {
    console.error('[createSubscription]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
