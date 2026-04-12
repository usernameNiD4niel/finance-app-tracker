import { Router, Request, Response } from 'express';
import { db } from '../firebase-admin';

const router = Router();

const LS_API = 'https://api.lemonsqueezy.com/v1';

router.post('/', async (req: Request, res: Response) => {
  const { userId, email } = req.body as { userId: string; email: string };

  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
  }

  try {
    const lsRes = await fetch(`${LS_API}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY!}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify({
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
              data: { type: 'stores', id: String(process.env.LEMONSQUEEZY_STORE_ID) },
            },
            variant: {
              data: { type: 'variants', id: String(process.env.LEMONSQUEEZY_VARIANT_ID) },
            },
          },
        },
      }),
    });

    const result = await lsRes.json() as any;

    if (result.errors) {
      const msg = result.errors[0]?.detail ?? 'Lemon Squeezy error';
      return res.status(502).json({ error: msg });
    }

    const checkoutUrl = result.data?.attributes?.url;
    if (!checkoutUrl) {
      return res.status(502).json({ error: 'No checkout URL returned' });
    }

    return res.json({ checkoutUrl });
  } catch (err: any) {
    console.error('[createCheckout]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
