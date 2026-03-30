import { getExpenses, getBills, getTotalSourceBalance } from '../db/queries';
import { getDaysUntilDue } from '../utils/date';

export async function calculateCurrentBalance(): Promise<{
  spent: number;
  billsDue: number;
  walletBalance: number;
  balance: number;
}> {
  const today = new Date();
  const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString().split('T')[0];

  const [monthExpenses, allBills, walletBalance] = await Promise.all([
    getExpenses({ startDate: startOfMonth, endDate: endOfMonth }),
    getBills(),
    getTotalSourceBalance(),
  ]);

  const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const billsDue = allBills
    .filter(b => b.isActive && b.frequency === 'monthly')
    .reduce((sum, b) => sum + b.amount, 0);

  const balance = walletBalance - spent - billsDue;

  return { spent, billsDue, walletBalance, balance };
}

export type UpcomingBill = {
  id: number;
  name: string;
  amount: number;
  daysUntilDue: number;
  categoryIcon: string | null;
  categoryColor: string | null;
};

export async function getUpcomingBills(days = 7): Promise<UpcomingBill[]> {
  const allBills = await getBills();
  return allBills
    .filter(b => b.isActive)
    .map(b => ({
      id: b.id,
      name: b.name,
      amount: b.amount,
      daysUntilDue: getDaysUntilDue(b.dueDay),
      categoryIcon: b.categoryIcon ?? null,
      categoryColor: b.categoryColor ?? null,
    }))
    .filter(b => b.daysUntilDue <= days)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export type DashboardData = {
  balance: { spent: number; billsDue: number; walletBalance: number; balance: number };
  upcomingBills: UpcomingBill[];
};

export async function getDashboardData(days = 7): Promise<DashboardData> {
  const today = new Date();
  const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString().split('T')[0];

  const [monthExpenses, allBills, walletBalance] = await Promise.all([
    getExpenses({ startDate: startOfMonth, endDate: endOfMonth }),
    getBills(),
    getTotalSourceBalance(),
  ]);

  // Calculate balance
  const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const billsDue = allBills
    .filter(b => b.isActive && b.frequency === 'monthly')
    .reduce((sum, b) => sum + b.amount, 0);
  const balance = walletBalance - spent - billsDue;

  // Derive upcoming bills from the same data
  const upcomingBills = allBills
    .filter(b => b.isActive)
    .map(b => ({
      id: b.id,
      name: b.name,
      amount: b.amount,
      daysUntilDue: getDaysUntilDue(b.dueDay),
      categoryIcon: b.categoryIcon ?? null,
      categoryColor: b.categoryColor ?? null,
    }))
    .filter(b => b.daysUntilDue <= days)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return {
    balance: { spent, billsDue, walletBalance, balance },
    upcomingBills,
  };
}
