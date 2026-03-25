import { getExpenses, getLatestSalaryByPeriod, getBills, getTotalSourceBalance } from '../db/queries';
import { getCurrentPeriodDates, getCurrentPeriod, getDaysUntilDue } from '../utils/date';

export async function calculateCurrentBalance(): Promise<{
  salary: number;
  spent: number;
  billsDue: number;
  walletBalance: number;
  balance: number;
  period: 'first' | 'fifteenth';
}> {
  const { start, end } = getCurrentPeriodDates();
  const period = getCurrentPeriod();

  const [salaryRecord, periodExpenses, allBills, walletBalance] = await Promise.all([
    getLatestSalaryByPeriod(period),
    getExpenses({ startDate: start, endDate: end }),
    getBills(),
    getTotalSourceBalance(),
  ]);

  const salary = salaryRecord?.amount ?? 0;
  const spent = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const today = new Date();
  const currentDay = today.getDate();

  // Bills due in current period
  const billsDue = allBills
    .filter(b => {
      if (!b.isActive) return false;
      if (b.frequency === 'monthly') {
        const dueDay = b.dueDay;
        if (period === 'first') return dueDay >= 1 && dueDay <= 14;
        else return dueDay >= 15;
      }
      return false;
    })
    .reduce((sum, b) => sum + b.amount, 0);

  const balance = walletBalance + salary - spent - billsDue;

  return { salary, spent, billsDue, walletBalance, balance, period };
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
