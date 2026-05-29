import { startBot } from './services/bot.service';
import app from './server';
import { config } from './config';

// Start Express server
const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`[server]: API running on http://localhost:${PORT}`);
});

// Start Telegram bot
startBot().catch(console.error);