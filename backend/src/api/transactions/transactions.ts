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

// Get metrics with period filter
router.get('/metrics', async (req, res) => {
  const userId = (req as any).user.userId;
  const period = (req.query.period as string) || 'month';
  
  try {
    const now = new Date();
    let currentStart: string;
    let compareStart: string;
    let compareEnd: string;
    let periodLabel: string;

    switch (period) {
      case 'all':
        currentStart = new Date(0).toISOString();
        compareStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        compareEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
        periodLabel = '';
        break;
      case 'year':
        currentStart = new Date(now.getFullYear(), 0, 1).toISOString();
        compareStart = new Date(now.getFullYear() - 1, 0, 1).toISOString();
        compareEnd = currentStart;
        periodLabel = 'vs last year';
        break;
      default: // 'month'
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        compareStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        compareEnd = currentStart;
        periodLabel = 'vs last month';
        break;
    }

    // Current period
    const { data: currentTxns } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .gte('created_at', currentStart);

    // Comparison period (skip for 'all')
    let compareTxns: any[] | null = [];
    if (period !== 'all') {
      const { data } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('created_at', compareStart)
        .lt('created_at', compareEnd);
      compareTxns = data;
    }

    const calc = (txns: any[]) => {
      const income = txns
        .filter((t) => t.type === 'INCOME')
        .reduce((s, t) => s + Number(t.amount), 0);
      const expense = txns
        .filter((t) => t.type === 'EXPENSE')
        .reduce((s, t) => s + Number(t.amount), 0);
      return { income, expense, balance: income - expense };
    };

    const current = calc(currentTxns || []);
    const previous = calc(compareTxns || []);

    const pct = (cur: number, prev: number) =>
      prev ? ((cur - prev) / prev) * 100
        : cur > 0 ? 100
        : cur < 0 ? -100
        : 0;

    return res.json({
      totalBalance: current.balance,
      income: current.income,
      expense: current.expense,
      incomeChange: period === 'all' ? null : pct(current.income, previous.income),
      expenseChange: period === 'all' ? null : pct(current.expense, previous.expense),
      balanceChange: period === 'all' ? null : pct(current.balance, previous.balance),
      periodLabel,
    });
  } catch (err) {
    console.error('Failed to fetch metrics:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;