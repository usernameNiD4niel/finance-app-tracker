import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { getExpenses } from '../db/queries';

type ExportFormat = 'csv' | 'json';

function toCSV(expenses: Awaited<ReturnType<typeof getExpenses>>): string {
  const header = 'Date,Amount,Category,Note\n';
  const rows = expenses.map(e =>
    `${e.date},${e.amount},"${e.categoryName ?? ''}","${(e.note ?? '').replace(/"/g, '""')}"`
  );
  return header + rows.join('\n');
}

export async function exportExpenses(
  startDate: string,
  endDate: string,
  exportFormat: ExportFormat
): Promise<void> {
  const data = await getExpenses({ startDate, endDate });
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
  const fileName = `expenses-${timestamp}.${exportFormat}`;
  const filePath = (FileSystem.cacheDirectory ?? '') + fileName;

  let content: string;
  if (exportFormat === 'csv') {
    content = toCSV(data);
  } else {
    content = JSON.stringify(
      data.map(e => ({
        date: e.date,
        amount: e.amount,
        category: e.categoryName,
        note: e.note,
      })),
      null,
      2
    );
  }

  await FileSystem.writeAsStringAsync(filePath, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: exportFormat === 'csv' ? 'text/csv' : 'application/json',
      dialogTitle: `Export Expenses (${exportFormat.toUpperCase()})`,
    });
  }
}
