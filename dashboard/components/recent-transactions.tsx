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
    <table className="w-full text-sm font-mono">
      <thead>
        <tr className="border-b-4 border-black bg-white text-black">
          <th className="text-left p-3">Date</th>
          <th className="text-left p-3">Description</th>
          <th className="text-left p-3">Category</th>
          <th className="text-right p-3">Amount</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t, i) => (
          <tr
            key={t.id}
            className={`border-b-2 border-black ${i % 2 === 0 ? "bg-white/5" : "bg-accent-cyan/5"}`}
          >
            <td className="p-3 font-mono text-gray-300">{formatDate(t.created_at)}</td>
            <td className="p-3 font-bold text-white">{t.description}</td>
            <td className="p-3">
              <span className="px-2 py-1 text-xs font-bold border-2 border-black bg-accent-yellow text-black">
                {t.category}
              </span>
            </td>
            <td
              className={`p-3 font-mono text-right font-bold ${
                t.type === "INCOME" ? "text-accent-green" : "text-accent-pink"
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
    <div className="space-y-2">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between p-3 border-b-2 border-black bg-white/5"
        >
          <div>
            <p className="font-bold text-white">{t.description}</p>
            <p className="text-xs text-gray-400">
              {formatDate(t.created_at)} · {t.category}
            </p>
          </div>
          <span
            className={`font-mono font-bold ${
              t.type === "INCOME" ? "text-accent-green" : "text-accent-pink"
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
    <Card className="border-4 border-black shadow-hard bg-black">
      <CardContent className="p-6">
        <CardTitle className="mb-4 text-white border-b-2 border-black pb-2">
          RECENT TRANSACTIONS
        </CardTitle>
        <div className="hidden md:block">
          <DesktopTable transactions={transactions} />
        </div>
        <div className="md:hidden">
          <MobileList transactions={transactions} />
        </div>
      </CardContent>
    </Card>
  );
}
