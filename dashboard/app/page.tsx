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
  { label: "OVERVIEW", icon: BarChart3, filter: "all" as Filter },
  { label: "INCOME", icon: ArrowUpRight, filter: "INCOME" as Filter },
  { label: "EXPENSE", icon: ArrowDownRight, filter: "EXPENSE" as Filter },
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
    { label: "ALL TIME", value: "all" },
    { label: "MONTH", value: "month" },
    { label: "YEAR", value: "year" },
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
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-accent-cyan font-mono animate-pulse">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      {/* MARQUEE HEADER */}
      <div className="bg-accent-green text-black border-b-4 border-black overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-marquee">
          LUMINA FINANCE — SMART TRACKING — LUMINA FINANCE — SMART TRACKING — LUMINA FINANCE — SMART TRACKING —
        </div>
      </div>

      <div className="flex">
        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen border-r-4 border-black bg-accent-cyan p-6 sticky top-0">
          <div className="flex items-center gap-3 mb-12">
            <Wallet size={24} className="text-black" strokeWidth={3} />
            <span className="text-2xl font-bold tracking-tighter uppercase">LUMINA</span>
          </div>
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setFilter(item.filter)}
                className={`flex items-center gap-3 px-4 py-3 border-4 border-black uppercase font-bold text-sm transition-colors ${
                  filter === item.filter
                    ? "bg-accent-pink text-white"
                    : "bg-white text-black hover:bg-accent-yellow"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 md:p-10 lg:p-12 max-w-7xl mx-auto">
          <header className="mb-10 border-b-4 border-black pb-4">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-accent-green">
              Dashboard
            </h1>
            <p className="text-sm text-gray-300 mt-2">your raw financial data</p>
          </header>

          {/* PERIOD SELECTOR */}
          <div className="flex items-center gap-2 mb-6">
            <Clock size={14} className="text-gray-400" strokeWidth={1.5} />
            {periodItems.map((item) => (
              <button
                key={item.value}
                onClick={() => { setPeriod(item.value); setLoading(true); }}
                className={`px-3 py-1.5 text-xs font-bold uppercase border-2 transition-colors ${
                  period === item.value
                    ? "bg-accent-cyan text-black border-accent-cyan"
                    : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t-4 border-black bg-accent-cyan flex justify-around py-3">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => setFilter(item.filter)}
            className={`flex flex-col items-center gap-1 text-xs font-bold ${
              filter === item.filter ? "text-accent-pink" : "text-black"
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
