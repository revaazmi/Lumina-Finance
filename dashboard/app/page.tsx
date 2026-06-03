"use client";

import { useEffect, useState, useMemo } from "react";
import { useFinanceStore, Period } from "@/store";
import { useAuth } from "@/contexts/auth-context";
import MetricsCards from "@/components/metrics-cards";
import RecentTransactions from "@/components/recent-transactions";
import SpendingChart from "@/components/spending-chart";
import { Wallet, BarChart3, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

type Filter = "all" | "INCOME" | "EXPENSE";

const navItems = [
  { label: "Overview", icon: BarChart3, filter: "all" as Filter },
  { label: "Income", icon: ArrowUpRight, filter: "INCOME" as Filter },
  { label: "Expense", icon: ArrowDownRight, filter: "EXPENSE" as Filter },
];

export default function Dashboard() {
  const { transactions, metrics, loading, period, setTransactions, setMetrics, setLoading, setPeriod } =
    useFinanceStore();
  const [filter, setFilter] = useState<Filter>("all");
  const { token, loading: authLoading, oneTapLogin, miniappLogin } = useAuth();
  const router = useRouter();

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

  const periodItems: { label: string; value: Period }[] = [
    { label: "All Time", value: "all" },
    { label: "Month", value: "month" },
    { label: "Year", value: "year" },
  ];

  useEffect(() => {
    if (authLoading) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error('NEXT_PUBLIC_API_URL is not set');
      setLoading(false);
      return;
    }

    async function tryAutoLogin() {
      const initData = window.Telegram?.WebApp?.initData;
      if (initData) {
        const t = await miniappLogin();
        if (t) { fetchData(t); return; }
      }

      const params = new URLSearchParams(window.location.search);
      const oneTapToken = params.get('token');
      if (oneTapToken) {
        const t = await oneTapLogin(oneTapToken);
        if (t) {
          window.history.replaceState({}, '', window.location.pathname);
          fetchData(t);
          return;
        }
      }

      if (token) {
        fetchData(token);
        return;
      }

      router.push("/login");
    }

    async function fetchData(t: string, p?: Period) {
      try {
        const txnRes = await fetch(`${apiUrl}/api/transactions`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (txnRes.ok) {
          setTransactions(await txnRes.json());
        } else if (txnRes.status === 401) {
          router.push("/login");
          return;
        }

        const metricsRes = await fetch(`${apiUrl}/api/transactions/metrics?period=${p || period}`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (metricsRes.ok) {
          setMetrics(await metricsRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }

    tryAutoLogin();
  }, [authLoading, token, period, setTransactions, setMetrics, setLoading, router, oneTapLogin, miniappLogin]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-gray-400 text-sm animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="flex">
        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-gray-200 bg-white p-8 sticky top-0">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Wallet size={16} className="text-white" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-semibold text-gray-900">Lumina</span>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setFilter(item.filter)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === item.filter
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <item.icon size={16} strokeWidth={1.5} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 md:p-10 lg:p-12 max-w-7xl mx-auto">
          <header className="mb-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-500 mt-1">Your financial overview</p>
              </div>
            </div>
          </header>

          {/* PERIOD SELECTOR */}
          <div className="flex items-center gap-2 mb-8">
            <Clock size={14} className="text-gray-400" strokeWidth={1.5} />
            {periodItems.map((item) => (
              <button
                key={item.value}
                onClick={() => { setPeriod(item.value); setLoading(true); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === item.value
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {metrics && (
            <MetricsCards
              totalBalance={metrics.totalBalance}
              income={metrics.income}
              expense={metrics.expense}
              incomeChange={metrics.incomeChange}
              expenseChange={metrics.expenseChange}
              balanceChange={metrics.balanceChange}
              periodLabel={metrics.periodLabel}
            />
          )}

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentTransactions transactions={filteredTransactions} />
            </div>
            <div>
              <SpendingChart transactions={filteredTransactions} />
            </div>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 px-4">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => setFilter(item.filter)}
            className={`flex flex-col items-center gap-1 text-xs font-medium ${
              filter === item.filter ? "text-gray-900" : "text-gray-400"
            }`}
          >
            <item.icon size={18} strokeWidth={1.5} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
