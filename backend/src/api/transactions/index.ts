import { Router } from 'express';
import transactionsRouter from './transactions';

const router = Router();
router.use('/', transactionsRouter);

export default router;