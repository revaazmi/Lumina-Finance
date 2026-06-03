"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

interface MetricsCardsProps {
  totalBalance: number;
  income: number;
  expense: number;
  incomeChange: number | null;
  expenseChange: number | null;
  balanceChange: number | null;
  periodLabel: string;
}

function formatCurrency(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function Change({ value }: { value: number | null }) {
  if (value === null) return null;
  const isPos = value >= 0;
  return (
    <span className={`text-xs font-bold ${isPos ? "text-accent-green" : "text-accent-pink"}`}>
      {isPos ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function MetricsCards({
  totalBalance,
  income,
  expense,
  incomeChange,
  expenseChange,
  balanceChange,
  periodLabel,
}: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-4 border-black shadow-hard bg-accent-cyan/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Total Balance</CardTitle>
            <Wallet size={18} className="text-accent-cyan" strokeWidth={2} />
          </div>
          <p className="text-3xl font-mono font-bold text-white uppercase tracking-tight">
            {formatCurrency(totalBalance)}
          </p>
          {balanceChange !== null && (
            <div className="mt-3 flex items-center gap-2">
              <Change value={balanceChange} />
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-4 border-black shadow-hard bg-accent-green/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Income</CardTitle>
            <span className="text-xl">↑</span>
          </div>
          <p className="text-3xl font-mono font-bold text-accent-green uppercase tracking-tight">
            {formatCurrency(income)}
          </p>
          {incomeChange !== null && (
            <div className="mt-3 flex items-center gap-2">
              <Change value={incomeChange} />
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-4 border-black shadow-hard bg-accent-pink/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Expense</CardTitle>
            <span className="text-xl">↓</span>
          </div>
          <p className="text-3xl font-mono font-bold text-accent-pink uppercase tracking-tight">
            {formatCurrency(expense)}
          </p>
          {expenseChange !== null && (
            <div className="mt-3 flex items-center gap-2">
              <Change value={expenseChange} />
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
