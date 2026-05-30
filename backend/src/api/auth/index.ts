import { Router } from 'express';
import loginRouter from './login';
import telegramRouter from './telegram';
import botLoginRouter from './bot-login';

const router = Router();
router.use('/login', loginRouter);
router.use('/telegram', telegramRouter);
router.use('/bot-login', botLoginRouter);

export default router;