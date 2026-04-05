import * as Notifications from 'expo-notifications';
import {
  insertNotificationLogsBatch,
  getExistingNotificationLogDates,
  getExistingLendNotificationLogDates,
  updateBill,
} from '../db/queries';

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Permissions ───────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

// Next occurrence of `dueDay` in the month at 8am local time.
function getNextMonthlyDueDate(dueDay: number): Date {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dueDay, 8, 0, 0);
  if (thisMonth > now) return thisMonth;
  return new Date(now.getFullYear(), now.getMonth() + 1, dueDay, 8, 0, 0);
}

function subtractOneDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

// ── Cancel ────────────────────────────────────────────────────────────────────
// Supports comma-separated IDs (we store "beforeId,onDayId" per bill/lend).

export async function cancelNotification(notificationId: string) {
  for (const id of notificationId.split(',')) {
    const trimmed = id.trim();
    if (trimmed) {
      await Notifications.cancelScheduledNotificationAsync(trimmed).catch(() => {});
    }
  }
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Bill notifications ────────────────────────────────────────────────────────
// Schedules 2 DATE-triggered notifications for a monthly bill:
//   • Day before at 8am — "Bill Due Tomorrow"
//   • Due day at 8am   — "Bill Due Today"
// Returns comma-separated IDs, or null on failure.

export async function scheduleBillNotification(
  billId: number,
  billName: string,
  amount: number,
  dueDay: number,
  _notifyDaysBefore: number,
  currency: string,
  frequency: string = 'monthly'
): Promise<string | null> {
  if (frequency !== 'monthly') return null;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const dueDate = getNextMonthlyDueDate(dueDay);
  const dayBefore = subtractOneDay(dueDate);
  const now = new Date();
  const amountStr = formatAmount(amount, currency);

  try {
    const ids: string[] = [];

    if (dayBefore > now) {
      const id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Bill Due Tomorrow',
          body: `${billName} — ${amountStr} is due tomorrow`,
          data: { billId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dayBefore,
        },
      });
      ids.push(id1);
    }

    if (dueDate > now) {
      const id2 = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💳 Bill Due Today',
          body: `${billName} — ${amountStr} is due today`,
          data: { billId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dueDate,
        },
      });
      ids.push(id2);
    }

    return ids.length > 0 ? ids.join(',') : null;
  } catch {
    return null;
  }
}

// ── Lend notifications ────────────────────────────────────────────────────────

export async function scheduleLendNotification(
  lendId: number,
  borrowerName: string,
  amount: number,
  expectedPayDate: string,
  currency: string
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const [year, month, day] = expectedPayDate.split('-').map(Number);
  const payDate = new Date(year, month - 1, day, 8, 0, 0);
  const dayBefore = subtractOneDay(payDate);
  const now = new Date();

  if (payDate <= now) return null;

  try {
    const ids: string[] = [];
    const amountStr = formatAmount(amount, currency);

    if (dayBefore > now) {
      const id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🤝 Lend Due Tomorrow',
          body: `${borrowerName} owes you ${amountStr} — expected tomorrow`,
          data: { lendId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dayBefore,
        },
      });
      ids.push(id1);
    }

    const id2 = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🤝 Lend Due Today',
        body: `${borrowerName} owes you ${amountStr} — expected today`,
        data: { lendId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: payDate,
      },
    });
    ids.push(id2);

    return ids.join(',');
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type BillForNotification = {
  id: number;
  name: string;
  amount: number;
  dueDay: number;
  notifyDaysBefore: number;
  isActive: boolean;
  frequency: string;
  notificationId: string | null;
};

type LendForNotification = {
  id: number;
  borrowerName: string;
  amount: number;
  expectedPayDate: string;
  isPaid: boolean;
  notificationId?: string | null;
};

// ── Notification log sync ─────────────────────────────────────────────────────

export async function syncNotificationLogs(
  billsList: BillForNotification[],
  lendsList: LendForNotification[],
  currency: string,
  userId: string | null
) {
  const now = new Date();

  for (const bill of billsList) {
    if (!bill.isActive || bill.frequency !== 'monthly') continue;

    const dueDate = getNextMonthlyDueDate(bill.dueDay);
    const dayBefore = subtractOneDay(dueDate);
    const amountStr = formatAmount(bill.amount, currency);
    const existingDates = new Set(await getExistingNotificationLogDates(bill.id));
    const newEntries: Parameters<typeof insertNotificationLogsBatch>[0] = [];

    if (dayBefore > now && !existingDates.has(dayBefore.toISOString())) {
      newEntries.push({
        billId: bill.id,
        title: '⏰ Bill Due Tomorrow',
        body: `${bill.name} — ${amountStr} is due tomorrow`,
        scheduledFor: dayBefore.toISOString(),
      });
    }
    if (dueDate > now && !existingDates.has(dueDate.toISOString())) {
      newEntries.push({
        billId: bill.id,
        title: '💳 Bill Due Today',
        body: `${bill.name} — ${amountStr} is due today`,
        scheduledFor: dueDate.toISOString(),
      });
    }
    if (newEntries.length > 0) await insertNotificationLogsBatch(newEntries, userId);
  }

  for (const lend of lendsList) {
    if (lend.isPaid) continue;

    const [year, month, day] = lend.expectedPayDate.split('-').map(Number);
    const payDate = new Date(year, month - 1, day, 8, 0, 0);
    if (payDate <= now) continue;

    const dayBefore = subtractOneDay(payDate);
    const amountStr = formatAmount(lend.amount, currency);
    const existingDates = new Set(await getExistingLendNotificationLogDates(lend.id));
    const newEntries: Parameters<typeof insertNotificationLogsBatch>[0] = [];

    if (dayBefore > now && !existingDates.has(dayBefore.toISOString())) {
      newEntries.push({
        lendId: lend.id,
        title: '🤝 Lend Due Tomorrow',
        body: `${lend.borrowerName} owes you ${amountStr} — expected tomorrow`,
        scheduledFor: dayBefore.toISOString(),
      });
    }
    if (!existingDates.has(payDate.toISOString())) {
      newEntries.push({
        lendId: lend.id,
        title: '🤝 Lend Due Today',
        body: `${lend.borrowerName} owes you ${amountStr} — expected today`,
        scheduledFor: payDate.toISOString(),
      });
    }
    if (newEntries.length > 0) await insertNotificationLogsBatch(newEntries, userId);
  }
}

// ── Reschedule missing bill notifications ─────────────────────────────────────

export async function rescheduleAllBillNotifications(
  billsList: BillForNotification[],
  currency: string
) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map(n => n.identifier));

    for (const bill of billsList) {
      if (!bill.isActive || bill.frequency !== 'monthly') continue;

      const existingIds = (bill.notificationId ?? '').split(',').map(s => s.trim()).filter(Boolean);
      const stillScheduled = existingIds.some(id => scheduledIds.has(id));
      if (stillScheduled) continue;

      const newId = await scheduleBillNotification(
        bill.id, bill.name, bill.amount, bill.dueDay, 1, currency, bill.frequency
      );
      if (newId) {
        await updateBill(bill.id, { notificationId: newId });
      }
    }
  } catch {
    // Permissions not yet granted — will retry on next startup
  }
}

// ── Test notification (dev / QA only) ─────────────────────────────────────────
// Schedules 2 notifications that fire 5 s and 10 s from now.

export async function sendTestNotification(): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const now = new Date();
  const in5s  = new Date(now.getTime() + 5_000);
  const in10s = new Date(now.getTime() + 10_000);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Bill Due Tomorrow',
      body: 'Netflix — $15.99 is due tomorrow',
      data: { billId: -1 },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: in5s,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💳 Bill Due Today',
      body: 'Netflix — $15.99 is due today',
      data: { billId: -1 },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: in10s,
    },
  });
}

// ── Notification tap listener ─────────────────────────────────────────────────

export type NotificationTapData = {
  billId?: number;
  lendId?: number;
};

function toId(val: unknown): number | undefined {
  if (val == null) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

export function initNotificationListeners(onTap: (data: NotificationTapData) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const raw = response.notification.request.content.data ?? {};
    // Coerce to number — some platforms serialise notification data as strings
    onTap({ billId: toId(raw.billId), lendId: toId(raw.lendId) });
  });
  return () => sub.remove();
}
