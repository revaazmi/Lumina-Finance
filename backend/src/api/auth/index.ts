import { Router } from 'express';
import loginRouter from './login';
import telegramRouter from './telegram';

const router = Router();
router.use('/login', loginRouter);
router.use('/telegram', telegramRouter);

export default router;