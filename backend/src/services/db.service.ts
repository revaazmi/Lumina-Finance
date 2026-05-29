import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { AITransaction } from '../types';

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

export async function getOrCreateUser(telegramId: string, username: string | null) {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', telegramId)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('users')
    .insert({ id: telegramId, username })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function insertTransaction(
  userId: string,
  transaction: AITransaction,
  rawInput: string
) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description,
      raw_input: rawInput,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTransactions(userId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMonthNetBalance(userId: string): Promise<number> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .gte('created_at', firstOfMonth);

  if (error) throw error;

  let income = 0;
  let expense = 0;
  for (const t of (data || [])) {
    const amount = Number(t.amount);
    if (t.type === 'INCOME') income += amount;
    else if (t.type === 'EXPENSE') expense += amount;
  }
  return income - expense;
}
