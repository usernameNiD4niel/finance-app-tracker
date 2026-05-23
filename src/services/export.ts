import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { getExpenses, getBills, getMoneySources, getLends, getBorrows, getExpenseTotalByCategory } from '../db/queries';

export type DataType = 'expenses' | 'bills' | 'stats' | 'wallets' | 'lends' | 'borrows';
export type ExportFormat = 'csv' | 'json';

// Used when no start date is provided — effectively "all time"
const ALL_TIME_START = '2000-01-01';

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ── CSV serializers ───────────────────────────────────────────────────────────

function expensesToCSV(data: Awaited<ReturnType<typeof getExpenses>>): string {
  const header = 'Date,Amount,Category,Wallet,Note';
  const rows = data.map(e =>
    `${e.date},${e.amount},"${e.categoryName ?? ''}","${e.sourceName ?? ''}","${(e.note ?? '').replace(/"/g, '""')}"`
  );
  return [header, ...rows].join('\n');
}

function billsToCSV(data: Awaited<ReturnType<typeof getBills>>): string {
  const header = 'Name,Amount,Category,Frequency,Due Day,Status';
  const rows = data.map(b =>
    `"${b.name}",${b.amount},"${b.categoryName ?? ''}","${b.frequency}",${b.dueDay},"${b.isActive ? 'Active' : 'Inactive'}"`
  );
  return [header, ...rows].join('\n');
}

function statsToCSV(data: Awaited<ReturnType<typeof getExpenseTotalByCategory>>): string {
  const total = data.reduce((sum, c) => sum + (c.total ?? 0), 0);
  const header = 'Category,Total,Percentage';
  const rows = data
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .map(c => {
      const pct = total > 0 ? ((c.total ?? 0) / total * 100).toFixed(1) : '0.0';
      return `"${c.categoryName ?? 'Unknown'}",${c.total ?? 0},${pct}%`;
    });
  return [header, ...rows].join('\n');
}

function walletsToCSV(data: Awaited<ReturnType<typeof getMoneySources>>): string {
  const header = 'Name,Type,Balance';
  const rows = data.map(w => `"${w.name}","${w.type}",${w.balance}`);
  return [header, ...rows].join('\n');
}

function lendsToCSV(data: Awaited<ReturnType<typeof getLends>>): string {
  const header = 'Borrower,Amount,Lend Date,Expected Pay Date,Status,Paid Date,Note';
  const rows = data.map(l =>
    `"${l.borrowerName}",${l.amount},"${l.lendDate}","${l.expectedPayDate}","${l.isPaid ? 'Paid' : 'Unpaid'}","${l.paidDate ?? ''}","${(l.note ?? '').replace(/"/g, '""')}"`
  );
  return [header, ...rows].join('\n');
}

function borrowsToCSV(data: Awaited<ReturnType<typeof getBorrows>>): string {
  const header = 'Lender,Amount,Receiving Wallet,Repayment Wallet,Borrow Date,Expected Pay Date,Status,Paid Date,Note';
  const rows = data.map(b =>
    `"${b.lenderName}",${b.amount},"${b.receivingSourceName ?? ''}","${b.repaymentSourceName ?? ''}","${b.borrowDate}","${b.expectedPayDate}","${b.isPaid ? 'Repaid' : 'Unpaid'}","${b.paidDate ?? ''}","${(b.note ?? '').replace(/"/g, '""')}"`
  );
  return [header, ...rows].join('\n');
}

// ── Main export function ──────────────────────────────────────────────────────

export async function exportData(
  types: DataType[],
  startDate: string | null,
  endDate: string | null,
  exportFormat: ExportFormat
): Promise<void> {
  const start = startDate || ALL_TIME_START;
  const end = endDate || todayStr();
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');

  // Fetch each selected type
  const fetched: Partial<Record<DataType, any[]>> = {};
  for (const type of types) {
    switch (type) {
      case 'expenses':
        fetched.expenses = await getExpenses(
          { startDate: startDate ?? undefined, endDate: endDate ?? undefined },
        );
        break;
      case 'bills':
        // Bills are recurring — date range is intentionally ignored
        fetched.bills = await getBills();
        break;
      case 'stats':
        fetched.stats = await getExpenseTotalByCategory(start, end);
        break;
      case 'wallets':
        // Wallets are snapshots — date range is intentionally ignored
        fetched.wallets = await getMoneySources();
        break;
      case 'lends': {
        const all = await getLends();
        // Apply optional date filter on lendDate
        fetched.lends = (startDate || endDate)
          ? all.filter(l => {
              if (startDate && l.lendDate < startDate) return false;
              if (endDate && l.lendDate > endDate) return false;
              return true;
            })
          : all;
        break;
      }
      case 'borrows': {
        const all = await getBorrows();
        // Apply optional date filter on borrowDate
        fetched.borrows = (startDate || endDate)
          ? all.filter(b => {
              if (startDate && b.borrowDate < startDate) return false;
              if (endDate && b.borrowDate > endDate) return false;
              return true;
            })
          : all;
        break;
      }
    }
  }

  const fileName = `ledgerist-export-${timestamp}.${exportFormat}`;
  const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  const filePath = dir + fileName;

  let content: string;

  if (exportFormat === 'json') {
    const output: Record<string, any> = {};

    if (fetched.expenses) {
      output.expenses = fetched.expenses.map(e => ({
        date: e.date,
        amount: e.amount,
        category: e.categoryName,
        wallet: e.sourceName,
        note: e.note,
      }));
    }
    if (fetched.bills) {
      output.bills = fetched.bills.map(b => ({
        name: b.name,
        amount: b.amount,
        category: b.categoryName,
        frequency: b.frequency,
        dueDay: b.dueDay,
        isActive: b.isActive,
      }));
    }
    if (fetched.stats) {
      const total = fetched.stats.reduce((sum, c) => sum + (c.total ?? 0), 0);
      output.stats = fetched.stats.map(c => ({
        category: c.categoryName ?? 'Unknown',
        total: c.total ?? 0,
        percentage: total > 0
          ? parseFloat(((c.total ?? 0) / total * 100).toFixed(1))
          : 0,
      }));
    }
    if (fetched.wallets) {
      output.wallets = fetched.wallets.map(w => ({
        name: w.name,
        type: w.type,
        balance: w.balance,
      }));
    }
    if (fetched.lends) {
      output.lends = fetched.lends.map(l => ({
        borrower: l.borrowerName,
        amount: l.amount,
        lendDate: l.lendDate,
        expectedPayDate: l.expectedPayDate,
        isPaid: l.isPaid,
        paidDate: l.paidDate ?? null,
        note: l.note ?? null,
      }));
    }
    if (fetched.borrows) {
      output.borrows = fetched.borrows.map(b => ({
        lender: b.lenderName,
        amount: b.amount,
        receivingWallet: b.receivingSourceName ?? null,
        repaymentWallet: b.repaymentSourceName ?? null,
        borrowDate: b.borrowDate,
        expectedPayDate: b.expectedPayDate,
        isPaid: b.isPaid,
        paidDate: b.paidDate ?? null,
        note: b.note ?? null,
      }));
    }

    content = JSON.stringify(output, null, 2);
  } else {
    // CSV: one labelled section per type, separated by blank lines
    const sections: string[] = [];
    if (fetched.expenses) sections.push(`--- EXPENSES ---\n${expensesToCSV(fetched.expenses)}`);
    if (fetched.bills)    sections.push(`--- BILLS ---\n${billsToCSV(fetched.bills)}`);
    if (fetched.stats)    sections.push(`--- SPENDING STATS ---\n${statsToCSV(fetched.stats)}`);
    if (fetched.wallets)  sections.push(`--- WALLETS ---\n${walletsToCSV(fetched.wallets)}`);
    if (fetched.lends)    sections.push(`--- LENDS ---\n${lendsToCSV(fetched.lends)}`);
    if (fetched.borrows)  sections.push(`--- BORROWS ---\n${borrowsToCSV(fetched.borrows)}`);
    content = sections.join('\n\n');
  }

  await FileSystem.writeAsStringAsync(filePath, content, { encoding: 'utf8' });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(`Sharing is not supported on this device.\nFile saved to: ${filePath}`);
  }
  await Sharing.shareAsync(filePath, {
    mimeType: exportFormat === 'csv' ? 'text/csv' : 'application/json',
    UTI: exportFormat === 'csv' ? 'public.comma-separated-values-text' : 'public.json',
    dialogTitle: `Ledgerist Export (${exportFormat.toUpperCase()})`,
  });
}
