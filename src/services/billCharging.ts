import { getBills, createExpense, adjustSourceBalance, updateBill } from '../db/queries';
import { useSettingsStore } from '../store/settingsStore';

// Single source of truth for "today" as a local YYYY-MM-DD string
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isDueBill(
  frequency: string,
  dueDay: number,
  chargeTime: string,
  lastChargedDate: string | null,
  now: Date,
): boolean {
  // Check charge time first (fast exit)
  const [h, m] = chargeTime.split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return false;

  const todayDate = toLocalDateStr(now);

  if (frequency === 'monthly') {
    // Clamp dueDay to last day of current month (handles 31 in 30-day months, etc.)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const effectiveDueDay = Math.min(dueDay, lastDayOfMonth);
    if (now.getDate() !== effectiveDueDay) return false;
    if (!lastChargedDate) return true;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return lastChargedDate.substring(0, 7) !== monthKey;
  }

  if (frequency === 'weekly') {
    if (!lastChargedDate) return true;
    // Parse as local date to avoid UTC-offset day shift
    const [ly, lm, ld] = lastChargedDate.split('-').map(Number);
    const last = new Date(ly, lm - 1, ld);
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }

  if (frequency === 'daily') {
    return lastChargedDate !== todayDate;
  }

  return false;
}

// Guard against concurrent invocations (e.g. rapid focus events)
let charging = false;

export async function processDueBills(): Promise<number> {
  if (charging) return 0;
  charging = true;

  try {
    const userId = useSettingsStore.getState().firebaseUid ?? null;
    const allBills = await getBills(userId);
    // Single time snapshot for the entire run — prevents midnight edge cases
    const now = new Date();
    const today = toLocalDateStr(now);
    let charged = 0;

    for (const bill of allBills) {
      if (!bill.isActive || !bill.sourceId) continue;
      if (!isDueBill(bill.frequency, bill.dueDay, bill.chargeTime, bill.lastChargedDate ?? null, now)) continue;

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
  } finally {
    charging = false;
  }
}
