import { format, startOfMonth, endOfMonth, getDate, getDaysInMonth } from 'date-fns';

export type SalaryPeriod = 'first' | 'fifteenth';

export function getCurrentPeriod(date = new Date()): SalaryPeriod {
  return getDate(date) < 15 ? 'first' : 'fifteenth';
}

export function getPeriodBounds(date = new Date()): { start: Date; end: Date } {
  const day = getDate(date);
  const year = date.getFullYear();
  const month = date.getMonth();

  if (day < 15) {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, 14, 23, 59, 59),
    };
  } else {
    return {
      start: new Date(year, month, 15),
      end: endOfMonth(date),
    };
  }
}

export function getCurrentPeriodDates(): { start: string; end: string } {
  const { start, end } = getPeriodBounds();
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

export function getMonthBounds(date = new Date()): { start: string; end: string } {
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
}

export function getCurrentMonth(date = new Date()): string {
  return format(date, 'yyyy-MM');
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy');
}

export function formatShortDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d');
}

export function formatMonthYear(dateStr: string): string {
  return format(new Date(dateStr), 'MMMM yyyy');
}

export function getDaysUntilDue(dueDay: number, today = new Date()): number {
  const currentDay = getDate(today);
  const daysInMonth = getDaysInMonth(today);
  if (dueDay >= currentDay) {
    return dueDay - currentDay;
  }
  return daysInMonth - currentDay + dueDay;
}

export function getPeriodProgress(date = new Date()): number {
  const { start, end } = getPeriodBounds(date);
  const total = end.getTime() - start.getTime();
  const elapsed = date.getTime() - start.getTime();
  return Math.min(Math.max(elapsed / total, 0), 1);
}
