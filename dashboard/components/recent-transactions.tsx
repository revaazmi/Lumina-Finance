"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/types";

function formatCurrency(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

function DesktopTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">No transactions yet</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
          <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
          <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
          <th className="text-right py-3 px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t, i) => (
          <tr
            key={t.id}
            className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
          >
            <td className="py-3 px-3 text-gray-500 text-xs">{formatDate(t.created_at)}</td>
            <td className="py-3 px-3 font-medium text-gray-900">{t.description}</td>
            <td className="py-3 px-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {t.category}
              </span>
            </td>
            <td
              className={`py-3 px-3 font-mono text-right text-sm font-semibold ${
                t.type === "INCOME" ? "text-income" : "text-expense"
              }`}
            >
              {t.type === "INCOME" ? "+" : "-"}
              {formatCurrency(t.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MobileList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">No transactions yet</p>;
  }

  return (
    <div className="space-y-1">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between py-3 border-b border-gray-100"
        >
          <div>
            <p className="font-medium text-gray-900 text-sm">{t.description}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(t.created_at)} &middot; {t.category}
            </p>
          </div>
          <span
            className={`font-mono text-sm font-semibold ${
              t.type === "INCOME" ? "text-income" : "text-expense"
            }`}
          >
            {t.type === "INCOME" ? "+" : "-"}
            {formatCurrency(t.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <CardTitle>Recent Transactions</CardTitle>
        </div>
        <div className="hidden md:block px-3 pb-3">
          <DesktopTable transactions={transactions} />
        </div>
        <div className="md:hidden px-6 pb-3">
          <MobileList transactions={transactions} />
        </div>
      </CardContent>
    </Card>
  );
}
