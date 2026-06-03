"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Transaction } from "@/types";

interface SpendingChartProps {
  transactions: Transaction[];
}

function aggregateByCategory(transactions: Transaction[]) {
  const expenses = transactions.filter((t) => t.type === "EXPENSE");
  const map = new Map<string, number>();

  for (const t of expenses) {
    map.set(t.category, (map.get(t.category) || 0) + t.amount);
  }

  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
}

function formatCurrency(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function SpendingChart({ transactions }: SpendingChartProps) {
  const data = aggregateByCategory(transactions);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent>
          <CardTitle className="mb-4">Spending by Category</CardTitle>
          <p className="text-sm text-gray-400 py-8 text-center">No expense data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-6">Spending by Category</CardTitle>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af", fontSize: 11, fontFamily: "var(--font-geist-sans), sans-serif" }}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af", fontSize: 10, fontFamily: "var(--font-geist-mono), monospace" }}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                cursor={{ fill: "#f5f5f5" }}
                contentStyle={{
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#fff",
                  color: "#111",
                  borderRadius: 6,
                  fontSize: 12,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  fontFamily: "var(--font-geist-sans), sans-serif",
                }}
                formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
              />
              <Bar dataKey="amount" fill="#dc2626" radius={[3, 3, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
