import { create } from "zustand";
import { Transaction, MonthlyMetrics } from "@/types";

interface FinanceState {
  transactions: Transaction[];
  metrics: MonthlyMetrics | null;
  loading: boolean;
  setTransactions: (transactions: Transaction[]) => void;
  setMetrics: (metrics: MonthlyMetrics) => void;
  setLoading: (loading: boolean) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  metrics: null,
  loading: true,
  setTransactions: (transactions) => set({ transactions }),
  setMetrics: (metrics) => set({ metrics }),
  setLoading: (loading) => set({ loading }),
}));
