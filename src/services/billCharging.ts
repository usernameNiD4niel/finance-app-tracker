import { getBills, createExpense, adjustSourceBalance, updateBill } from '../db/queries';
import { useSettingsStore } from '../store/settingsStore';

function isChargeTimeMet(chargeTime: string): boolean {
  const [h, m] = chargeTime.split(':').map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isDueBill(
  frequency: string,
  dueDay: number,
  chargeTime: string,
  lastChargedDate: string | null,
): boolean {
  if (!isChargeTimeMet(chargeTime)) return false;

  const today = new Date();
  const todayDate = todayStr();

  if (frequency === 'monthly') {
    if (today.getDate() !== dueDay) return false;
    const monthKey = currentMonthKey();
    if (!lastChargedDate) return true;
    // Already charged this month?
    return lastChargedDate.substring(0, 7) !== monthKey;
  }

  if (frequency === 'weekly') {
    if (!lastChargedDate) return true;
    const last = new Date(lastChargedDate);
    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }

  if (frequency === 'daily') {
    return lastChargedDate !== todayDate;
  }

  return false;
}

export async function processDueBills(): Promise<number> {
  const userId = useSettingsStore.getState().firebaseUid ?? null;
  const allBills = await getBills(userId);
  const today = todayStr();
  let charged = 0;

  for (const bill of allBills) {
    if (!bill.isActive) continue;
    if (!bill.sourceId) continue;

    if (!isDueBill(bill.frequency, bill.dueDay, bill.chargeTime, bill.lastChargedDate ?? null)) {
      continue;
    }

    await createExpense(
      {
        amount: bill.amount,
        categoryId: bill.categoryId,
        sourceId: bill.sourceId,
        note: `Bill: ${bill.name}`,
        date: today,
        createdAt: new Date().toISOString(),
      },
      userId,
    );

    await adjustSourceBalance(bill.sourceId, -bill.amount);
    await updateBill(bill.id, { lastChargedDate: today });
    charged++;
  }

  return charged;
}
