"use strict";
import express from 'express';
import { json } from 'body-parser';
import authRouter from './api/auth';
import transactionRouter from './api/transactions';
import { verifyToken } from './middleware/auth';

const app = express();
const PORT = process.env.PORT ?? 3001;

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/transactions', verifyToken, transactionRouter);

// Start server
app.listen(PORT, () => {
  console.log(`[server]: API running on http://localhost:${PORT}`);
});

export default app;