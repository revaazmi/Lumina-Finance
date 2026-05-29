import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { supabase } from '../../services/db.service';

const router = Router();

router.post('/', async (req, res) => {
  const { telegramId, pin } = req.body;
  
  if (!telegramId || !pin) {
    return res.status(400).json({ error: 'Telegram ID and PIN are required' });
  }
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', telegramId)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid Telegram ID or PIN' });
    }
    
    if (!user.pin_hash) {
      return res.status(403).json({ error: 'PIN not set. Please set your PIN via Telegram bot: /setpin' });
    }
    
    const valid = await bcrypt.compare(pin, user.pin_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid Telegram ID or PIN' });
    }
    
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, username: user.username } });
    
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;