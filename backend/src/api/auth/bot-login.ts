import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { supabase } from '../../services/db.service';

const router = Router();

router.post('/', async (req, res) => {
  const { token: oneTapToken } = req.body;

  if (!oneTapToken) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const payload = jwt.verify(oneTapToken, config.jwtSecret) as { userId: string };

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Send /login again in Telegram bot.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
