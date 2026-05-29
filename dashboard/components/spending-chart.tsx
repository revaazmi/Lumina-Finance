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
      <Card className="border-4 border-black shadow-hard bg-black">
        <CardContent className="p-6">
          <CardTitle className="mb-4 text-white border-b-2 border-black pb-2">
            SPENDING BY CATEGORY
          </CardTitle>
          <p className="text-sm text-gray-400 py-8 text-center">No expense data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-4 border-black shadow-hard bg-black">
      <CardContent className="p-6">
        <CardTitle className="mb-6 text-white border-b-2 border-black pb-2">
          SPENDING BY CATEGORY
        </CardTitle>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#fff", fontSize: 12, fontFamily: "monospace" }}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#fff", fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                cursor={{ fill: "#1a1a1a" }}
                contentStyle={{
                  border: "2px solid #000",
                  backgroundColor: "#0a0a0a",
                  color: "#fff",
                  borderRadius: 0,
                  fontSize: 13,
                  boxShadow: "none",
                  fontFamily: "monospace",
                }}
                formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
              />
              <Bar dataKey="amount" fill="#ff0055" radius={[0, 0, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
