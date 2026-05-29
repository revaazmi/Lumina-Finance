import { Router } from 'express';
import { supabase } from '../../services/db.service';

const router = Router();

// Get recent transactions
router.get('/', async (req, res) => {
  const userId = (req as any).user.userId;
  
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('Failed to fetch transactions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly metrics
router.get('/metrics', async (req, res) => {
  const userId = (req as any).user.userId;
  
  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    
    // Current month
    const { data: monthTxns } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .gte('created_at', firstOfMonth);
    
    // Last month
    const { data: lastMonthTxns } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .gte('created_at', firstOfLastMonth)
      .lt('created_at', firstOfMonth);
    
    const calc = (txns: any[]) => {
      const income = txns
        .filter((t) => t.type === 'INCOME')
        .reduce((s, t) => s + Number(t.amount), 0);
      const expense = txns
        .filter((t) => t.type === 'EXPENSE')
        .reduce((s, t) => s + Number(t.amount), 0);
      return { income, expense, balance: income - expense };
    };
    
    const current = calc(monthTxns || []);
    const previous = calc(lastMonthTxns || []);
    
    return res.json({
      totalBalance: current.balance,
      income: current.income,
      expense: current.expense,
      incomeChange: previous.income
        ? ((current.income - previous.income) / previous.income) * 100
        : current.income > 0
          ? 100
          : 0,
      expenseChange: previous.expense
        ? ((current.expense - previous.expense) / previous.expense) * 100
        : current.expense > 0
          ? 100
          : 0,
      balanceChange: previous.balance
        ? ((current.balance - previous.balance) / Math.abs(previous.balance)) * 100
        : current.balance > 0
          ? 100
          : current.balance < 0
            ? -100
            : 0,
    });
  } catch (err) {
    console.error('Failed to fetch metrics:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;