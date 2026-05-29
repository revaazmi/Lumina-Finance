export type TransactionType = 'INCOME' | 'EXPENSE';

export interface AITransaction {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  confidenceScore: number;
}

export interface Transaction extends AITransaction {
  id: string;
  user_id: string;
  raw_input: string | null;
  created_at: string;
}

export interface User {
  id: string;
  username: string | null;
  created_at: string;
}
