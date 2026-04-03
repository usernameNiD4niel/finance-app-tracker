import { Router, Request, Response } from 'express';
import { db } from '../firebase-admin';

const router = Router();

router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const ref = db.collection('users').doc(userId).collection('profile').doc('subscription');
    const snap = await ref.get();

    if (!snap.exists) {
      return res.json({ isPremium: false, subscriptionStatus: null });
    }

    const { isPremium, subscriptionStatus } = snap.data()!;
    return res.json({ isPremium: !!isPremium, subscriptionStatus: subscriptionStatus ?? null });
  } catch (err: any) {
    console.error('[subscriptionStatus]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
