# Lumina Finance

AI-powered Telegram finance tracker with a Neo-Brutalist dashboard. Record income/expenses via text, voice notes, or receipt photos. Built with Node.js, Next.js, Supabase, and Groq LLM.

---

## Features

**Telegram Bot**
- Multi-modal input: text, voice (transcribed via Groq Whisper), and image analysis (Groq Llama vision)
- AI extracts: type, amount, category, description, confidence
- Inline confirmation (Save / Edit / Cancel)
- `/report` command (daily/weekly/monthly)
- `/setpin` — set PIN for dashboard login
- Edit flow: adjust type, amount, category, description before saving

**Dashboard (Neo-Brutalism UI)**
- Minimalist, high-contrast design (dark mode, neon accents)
- Real-time metrics: Balance, Income, Expense, % changes
- Transaction list with category badges
- Spending chart (top categories)
- Filter by ALL / INCOME / EXPENSE
- **Telegram Mini App support** — auto-login via initData (skip PIN entirely)
- Manual login fallback via Telegram ID + PIN
- Token persistence in localStorage (no re-login on refresh)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Bot backend | Node.js, TypeScript, Telegraf |
| AI | Groq (Whisper + Llama 3.3 / Llama 4 Scout) |
| Frontend | Next.js 14 (App Router), Tailwind CSS, Recharts, Zustand |
| DB | Supabase PostgreSQL |
| Deploy | Vercel (Frontend), Railway/Render (Backend) |

---

## Repository Structure

```
Fintrack Tele/
├── backend/          # Telegram bot + Express API server
│   ├── src/
│   │   ├── api/          # REST endpoints (auth, transactions)
│   │   ├── config/       # Env config loader
│   │   ├── middleware/   # JWT auth middleware
│   │   ├── services/     # Bot, DB, Groq extraction, Groq transcribe
│   │   └── types/        # TypeScript definitions
│   ├── supabase.sql      # DB schema + RLS policies
│   ├── .env.example
│   └── package.json
├── dashboard/         # Next.js 14 dashboard
│   ├── app/            # Pages (dashboard, login)
│   ├── components/     # Metrics cards, transactions table, chart
│   ├── contexts/       # Auth context (login + Mini App)
│   ├── store/          # Zustand store
│   └── lib/            # Supabase client, utils
├── .gitignore
└── README.md
```

---

## Prerequisites

- Node.js 20+
- npm
- Telegram Bot Token (from @BotFather)
- Groq API Key (console.groq.com)
- Supabase project URL + anon key
- Git & GitHub account (for deploy)

---

## Local Development

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/fintrack-tele.git
cd "Fintrack Tele"
```

Install dependencies for both modules:

```bash
cd backend && npm install && cd ..
cd dashboard && npm install && cd ..
```

### 2. Environment Variables

**Backend** (`backend/.env`):
```env
BOT_TOKEN=your_telegram_bot_token
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_random_jwt_secret
```

**Frontend** (`dashboard/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Database Setup (Supabase)

Run the full SQL from `backend/supabase.sql` in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT,
  pin_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  raw_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT TO anon USING (true);
```

### 4. Run Locally

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```

**Frontend (Terminal 2):**
```bash
cd dashboard
npm run dev
```

Open `http://localhost:3000` for dashboard. Talk to your bot on Telegram.

---

## Usage

### Telegram Bot

- `/start` — welcome message with current balance
- Send **text** (e.g. `beli nasi goreng 25000`) → AI extracts data
- Send **voice note** → transcribed then extracted
- Send **photo** (receipt) → vision analysis extracts transaction
- `/report` — shows daily/weekly/monthly summary
- `/setpin <6-digit-pin>` — set PIN for dashboard login (bot replies with your Telegram ID)
- Use inline **Edit** button to adjust fields before saving

### Dashboard

- **Telegram Mini App** — open from bot menu → auto-login (no PIN needed)
- **Manual login** — enter Telegram ID + PIN (get ID via `/setpin` or `/me`)
- View balance, income, expense trends
- Filter transactions by All / Income / Expense (via sidebar)
- See top spending categories in chart
- Responsive: bottom nav on mobile
- Token persists in localStorage (refresh safe)

---

## Telegram Mini App Setup

1. Go to [@BotFather](https://t.me/BotFather)
2. Send `/mybots` → select your bot
3. **Bot Settings** → **Menu Button** → set URL to your Vercel dashboard URL
4. Also set **Domain** for Mini App in Bot Settings if prompted
5. Done — users can open dashboard directly from bot menu

---

## Deployment

### GitHub (monorepo)

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<username>/fintrack-tele.git
git push -u origin main
```

### Railway (Backend Bot)

1. Go to [Railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select repo `fintrack-tele`, root directory: `backend`
3. Set environment variables (same as `backend/.env`):
   - `BOT_TOKEN`
   - `GROQ_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy

### Vercel (Dashboard)

1. Go to [Vercel](https://vercel.com) → New Project → Import `fintrack-tele`
2. Root directory: `dashboard`
3. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (point to your Railway backend URL)
4. Framework preset: Next.js
5. Deploy

---

## Environment Variables Reference

| Variable | Used In | Purpose |
|---|---|---|
| `BOT_TOKEN` | backend | Telegram Bot token from @BotFather |
| `GROQ_API_KEY` | backend | Groq API key for LLM + Whisper |
| `SUPABASE_URL` | backend + dashboard | Supabase project URL |
| `SUPABASE_ANON_KEY` | backend + dashboard | Public Supabase key |
| `JWT_SECRET` | backend | Secret for signing auth tokens |
| `NEXT_PUBLIC_SUPABASE_URL` | dashboard | Same as above (prefixed) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dashboard | Same as above (prefixed) |
| `NEXT_PUBLIC_API_URL` | dashboard | Backend API URL (localhost:3001 or deployed) |

---

## Notes

- **AI Models**: Text extraction uses `llama-3.3-70b-versatile`; image extraction uses `meta-llama/llama-4-scout-17b-16e-instruct` via Groq. Both share the same `GROQ_API_KEY`.
- **CORS**: Backend allows all origins (`*`) for Telegram Mini App compatibility.
- **Groq Free Tier**: generous rate limits; monitor at console.groq.com
- **Supabase**: RLS policies are included in `supabase.sql`. Run the full script to ensure anon key has access.
- **Bot mode**: polling (default), suitable for Railway/Render. Mini App auth uses HMAC verification.
- **Error handling**: Bot retries on rate limits; logs to console.

---

## Troubleshooting

**Bot not starting (ETIMEDOUT):**
- Check `BOT_TOKEN` validity
- Ensure outbound to `api.telegram.org:443` is not blocked
- Run `Test-NetConnection api.telegram.org -Port 443` (PowerShell)

**Groq errors (429/503):**
- Free tier limits reached; wait or upgrade
- Retry logic built-in; check logs

**Dashboard not loading data:**
- Verify Supabase env vars
- Check RLS policies (run `supabase.sql` fully)
- Ensure `NEXT_PUBLIC_API_URL` points to running backend

**Mini App not opening / blank screen:**
- Verify Mini App domain is set correctly in @BotFather
- Dashboard must be served over HTTPS (Vercel handles this)
- Check browser console for CORS / CSP errors

**Build fails on Tailwind:**
- Neo-brutal utilities defined in `globals.css`
- Ensure `@layer utilities` block correct

---

## License

MIT
