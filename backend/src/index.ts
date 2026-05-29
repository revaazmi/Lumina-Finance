import { startBot } from './services/bot.service';
import app from './server';
import { config } from './config';

// Start Express server
const PORT = process.env.PORT ?? 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server]: API running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[server]: SIGTERM received, shutting down...');
  server.close(() => {
    console.log('[server]: Server closed');
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  console.log('[server]: SIGINT received, shutting down...');
  server.close(() => {
    console.log('[server]: Server closed');
    process.exit(0);
  });
});

// Start Telegram bot
if (config.botToken) {
  startBot().catch(console.error);
} else {
  console.log('[bot]: BOT_TOKEN not set, skipping bot startup');
}