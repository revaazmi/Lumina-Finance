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

-- RLS Policies (allow anon key for server-side operations)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users: allow all operations for anon key (validated by backend JWT)
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon USING (true);

-- Transactions: allow all operations for anon key (validated by backend JWT)
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT TO anon USING (true);
