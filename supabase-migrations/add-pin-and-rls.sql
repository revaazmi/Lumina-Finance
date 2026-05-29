-- Add pin_hash column to users table
ALTER TABLE users ADD COLUMN pin_hash TEXT;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can view own user data" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own user data" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (user_id = auth.uid());