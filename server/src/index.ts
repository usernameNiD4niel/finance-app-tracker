import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import createCheckoutRouter from './routes/createSubscription';
import webhookRouter from './routes/webhook';
import subscriptionStatusRouter from './routes/subscriptionStatus';

const app = express();

// Webhook route must use raw body for signature verification
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);

// All other routes use JSON
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/create-checkout', createCheckoutRouter);
app.use('/api/subscription-status', subscriptionStatusRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Ledgerist server running on port ${PORT}`);
});
