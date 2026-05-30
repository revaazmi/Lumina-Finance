import { Router } from 'express';
import { createHmac } from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { getOrCreateUser } from '../../services/db.service';

const router = Router();

function verifyTelegramInitData(initData: string): { id: string; username?: string } | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const sorted: string[] = [];
  for (const [k, v] of params.entries()) {
    sorted.push(`${k}=${v}`);
  }
  sorted.sort();

  const dataCheckString = sorted.join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(config.botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return null;

  const userStr = params.get('user');
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);
    return { id: String(user.id), username: user.username || null };
  } catch {
    return null;
  }
}

router.post('/', async (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({ error: 'initData is required' });
  }

  const verified = verifyTelegramInitData(initData);
  if (!verified) {
    return res.status(401).json({ error: 'Invalid Telegram init data' });
  }

  try {
    const user = await getOrCreateUser(verified.id, verified.username || '');
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Telegram auth error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
