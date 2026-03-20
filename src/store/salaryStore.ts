import { create } from 'zustand';
import { getSalary, getLatestSalaryByPeriod, upsertSalary } from '../db/queries';
import type { Salary, NewSalary } from '../db/schema';

interface SalaryState {
  salaryFirst: Salary | null;
  salaryFifteenth: Salary | null;
  isLoading: boolean;
  loadSalary: () => Promise<void>;
  setSalary: (data: NewSalary) => Promise<void>;
}

export const useSalaryStore = create<SalaryState>((set) => ({
  salaryFirst: null,
  salaryFifteenth: null,
  isLoading: false,

  loadSalary: async () => {
    set({ isLoading: true });
    const [first, fifteenth] = await Promise.all([
      getLatestSalaryByPeriod('first'),
      getLatestSalaryByPeriod('fifteenth'),
    ]);
    set({
      salaryFirst: first ?? null,
      salaryFifteenth: fifteenth ?? null,
      isLoading: false,
    });
  },

  setSalary: async (data) => {
    await upsertSalary(data);
    const updated = await getLatestSalaryByPeriod(data.period);
    if (data.period === 'first') set({ salaryFirst: updated ?? null });
    else set({ salaryFifteenth: updated ?? null });
  },
}));
