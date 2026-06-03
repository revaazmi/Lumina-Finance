"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

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
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isPos ? "text-income" : "text-expense"}`}>
      {isPos ? <TrendingUp size={12} strokeWidth={1.5} /> : <TrendingDown size={12} strokeWidth={1.5} />}
      {Math.abs(value).toFixed(1)}%
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Balance
            </CardTitle>
            <Wallet size={16} className="text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight font-mono">
            {formatCurrency(totalBalance)}
          </p>
          {balanceChange !== null && (
            <div className="mt-2 flex items-center gap-2">
              <Change value={balanceChange} />
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Income
            </CardTitle>
            <TrendingUp size={16} className="text-income" strokeWidth={1.5} />
          </div>
          <p className="text-2xl font-semibold text-income tracking-tight font-mono">
            {formatCurrency(income)}
          </p>
          {incomeChange !== null && (
            <div className="mt-2 flex items-center gap-2">
              <Change value={incomeChange} />
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expense
            </CardTitle>
            <TrendingDown size={16} className="text-expense" strokeWidth={1.5} />
          </div>
          <p className="text-2xl font-semibold text-expense tracking-tight font-mono">
            {formatCurrency(expense)}
          </p>
          {expenseChange !== null && (
            <div className="mt-2 flex items-center gap-2">
              <Change value={expenseChange} />
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
