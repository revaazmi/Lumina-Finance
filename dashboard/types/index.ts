export type TransactionType = "INCOME" | "EXPENSE";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  raw_input: string | null;
  created_at: string;
}

export interface MonthlyMetrics {
  totalBalance: number;
  income: number;
  expense: number;
  incomeChange: number | null;
  expenseChange: number | null;
  balanceChange: number | null;
  periodLabel: string;
}
