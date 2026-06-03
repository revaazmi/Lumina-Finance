import { create } from "zustand";
import { Transaction, MonthlyMetrics } from "@/types";

export type Period = "all" | "month" | "year";

interface FinanceState {
  transactions: Transaction[];
  metrics: MonthlyMetrics | null;
  loading: boolean;
  period: Period;
  setTransactions: (transactions: Transaction[]) => void;
  setMetrics: (metrics: MonthlyMetrics) => void;
  setLoading: (loading: boolean) => void;
  setPeriod: (period: Period) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  metrics: null,
  loading: true,
  period: "all",
  setTransactions: (transactions) => set({ transactions }),
  setMetrics: (metrics) => set({ metrics }),
  setLoading: (loading) => set({ loading }),
  setPeriod: (period) => set({ period }),
}));
