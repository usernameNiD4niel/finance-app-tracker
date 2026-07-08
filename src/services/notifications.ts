import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  insertNotificationLogsBatch,
  getExistingNotificationLogDates,
  getExistingLendNotificationLogDates,
  getExistingBorrowNotificationLogDates,
  updateBill,
} from '../db/queries';

// expo-notifications push token registration is unsupported in Expo Go (SDK 53+).
// All notification functions are no-ops when running in Expo Go.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Show notifications even when the app is in the foreground
if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ── Permissions ───────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (IS_EXPO_GO) return false;
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

// ── Same-day catch-up ───────────────────────────────────────────────────────────
// "Due today" notifications are scheduled for 8am on the due day. If an item is due
// *today* but 8am has already passed, we don't want to skip the reminder entirely —
// fire it a few seconds out so the user still gets notified today.
const SAME_DAY_CATCHUP_MS = 10_000;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Resolves when the "due today" notification should actually fire:
//   • 8am still ahead         → that 8am moment (normal case)
//   • 8am passed, still today → ~10s from now (catch-up)
//   • the due day is over     → null (caller skips)
function resolveDueTrigger(dueAt8am: Date, now: Date): Date | null {
  if (dueAt8am > now) return dueAt8am;
  if (isSameCalendarDay(dueAt8am, now)) return new Date(now.getTime() + SAME_DAY_CATCHUP_MS);
  return null;
}

// ── Cancel ────────────────────────────────────────────────────────────────────
// Supports comma-separated IDs (we store "beforeId,onDayId" per bill/lend).

export async function cancelNotification(notificationId: string) {
  if (IS_EXPO_GO) return;
  for (const id of notificationId.split(',')) {
    const trimmed = id.trim();
    if (trimmed) {
      await Notifications.cancelScheduledNotificationAsync(trimmed).catch(() => {});
    }
  }
}

export async function cancelAllNotifications() {
  if (IS_EXPO_GO) return;
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
  if (IS_EXPO_GO) return null;
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

    // Same-day catch-up: bill is due today but 8am already passed (so the due date
    // above rolled to next month) — fire a reminder shortly so today isn't missed.
    const thisMonthDueAt8 = new Date(now.getFullYear(), now.getMonth(), dueDay, 8, 0, 0);
    if (thisMonthDueAt8 <= now && isSameCalendarDay(thisMonthDueAt8, now)) {
      const id3 = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💳 Bill Due Today',
          body: `${billName} — ${amountStr} is due today`,
          data: { billId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(now.getTime() + SAME_DAY_CATCHUP_MS),
        },
      });
      ids.push(id3);
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
  if (IS_EXPO_GO) return null;
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const [year, month, day] = expectedPayDate.split('-').map(Number);
  const payDate = new Date(year, month - 1, day, 8, 0, 0);
  const dayBefore = subtractOneDay(payDate);
  const now = new Date();

  // Skip only when the due day is fully past; if it's still today but 8am has
  // passed, resolveDueTrigger gives a "fire shortly" time instead of null.
  const dueTrigger = resolveDueTrigger(payDate, now);
  if (!dueTrigger) return null;

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
        date: dueTrigger,
      },
    });
    ids.push(id2);

    return ids.join(',');
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

// Reminds the user to pay the lender back, mirroring lend reminders.
export async function scheduleBorrowNotification(
  borrowId: number,
  lenderName: string,
  amount: number,
  expectedPayDate: string,
  currency: string
): Promise<string | null> {
  if (IS_EXPO_GO) return null;
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const [year, month, day] = expectedPayDate.split('-').map(Number);
  const payDate = new Date(year, month - 1, day, 8, 0, 0);
  const dayBefore = subtractOneDay(payDate);
  const now = new Date();

  // Skip only when the due day is fully past; if it's still today but 8am has
  // passed, resolveDueTrigger gives a "fire shortly" time instead of null.
  const dueTrigger = resolveDueTrigger(payDate, now);
  if (!dueTrigger) return null;

  try {
    const ids: string[] = [];
    const amountStr = formatAmount(amount, currency);

    if (dayBefore > now) {
      const id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💸 Repayment Due Tomorrow',
          body: `You owe ${lenderName} ${amountStr} — due tomorrow`,
          data: { borrowId },
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
        title: '💸 Repayment Due Today',
        body: `You owe ${lenderName} ${amountStr} — due today`,
        data: { borrowId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dueTrigger,
      },
    });
    ids.push(id2);

    return ids.join(',');
  } catch {
    return null;
  }
}

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

type BorrowForNotification = {
  id: number;
  lenderName: string;
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
  borrowsList: BorrowForNotification[] = [],
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
    if (newEntries.length > 0) await insertNotificationLogsBatch(newEntries);
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
    if (newEntries.length > 0) await insertNotificationLogsBatch(newEntries);
  }

  for (const borrow of borrowsList) {
    if (borrow.isPaid) continue;

    const [year, month, day] = borrow.expectedPayDate.split('-').map(Number);
    const payDate = new Date(year, month - 1, day, 8, 0, 0);
    if (payDate <= now) continue;

    const dayBefore = subtractOneDay(payDate);
    const amountStr = formatAmount(borrow.amount, currency);
    const existingDates = new Set(await getExistingBorrowNotificationLogDates(borrow.id));
    const newEntries: Parameters<typeof insertNotificationLogsBatch>[0] = [];

    if (dayBefore > now && !existingDates.has(dayBefore.toISOString())) {
      newEntries.push({
        borrowId: borrow.id,
        title: '💸 Repayment Due Tomorrow',
        body: `You owe ${borrow.lenderName} ${amountStr} — due tomorrow`,
        scheduledFor: dayBefore.toISOString(),
      });
    }
    if (!existingDates.has(payDate.toISOString())) {
      newEntries.push({
        borrowId: borrow.id,
        title: '💸 Repayment Due Today',
        body: `You owe ${borrow.lenderName} ${amountStr} — due today`,
        scheduledFor: payDate.toISOString(),
      });
    }
    if (newEntries.length > 0) await insertNotificationLogsBatch(newEntries);
  }
}

// ── Reschedule missing bill notifications ─────────────────────────────────────

export async function rescheduleAllBillNotifications(
  billsList: BillForNotification[],
  currency: string
) {
  if (IS_EXPO_GO) return;
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
  if (IS_EXPO_GO) return;
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
  borrowId?: number;
};

function toId(val: unknown): number | undefined {
  if (val == null) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

// Tracks notification responses already routed this session so a cold-start tap
// (read via getLastNotificationResponseAsync) and the live listener don't both
// fire for the same notification.
const handledTapIds = new Set<string>();

function claimTap(id: string): boolean {
  if (handledTapIds.has(id)) return false;
  handledTapIds.add(id);
  return true;
}

function parseTapResponse(
  response: Notifications.NotificationResponse,
): { data: NotificationTapData; id: string } {
  const raw = response.notification.request.content.data ?? {};
  // Coerce to number — some platforms serialise notification data as strings
  return {
    data: { billId: toId(raw.billId), lendId: toId(raw.lendId), borrowId: toId(raw.borrowId) },
    id: response.notification.request.identifier,
  };
}

// Whether the user has passed the lock screen this session. Deep links from a
// notification must wait for this so we never reveal data behind the PIN gate.
let appUnlocked = false;
export function setAppUnlocked(value: boolean) { appUnlocked = value; }
export function isAppUnlocked(): boolean { return appUnlocked; }

// A tap captured before the app was unlocked, applied right after unlock.
let pendingTap: NotificationTapData | null = null;
export function setPendingNotificationTap(data: NotificationTapData) { pendingTap = data; }
export function consumePendingNotificationTap(): NotificationTapData | null {
  const t = pendingTap;
  pendingTap = null;
  return t;
}

// Routes a tap to the screen showing the item that triggered it. Bills and
// lends land on their list with the relevant row highlighted; anything else
// (e.g. the dev test notification) opens the notification center.
export function buildNotificationRoute(
  data: NotificationTapData,
): { pathname: string; params?: Record<string, string> } {
  const { billId, lendId, borrowId } = data;
  if (billId != null && billId > 0) {
    return { pathname: '/(tabs)/bills', params: { highlightId: String(billId) } };
  }
  if (lendId != null && lendId > 0) {
    return { pathname: '/modals/lends', params: { highlightId: String(lendId) } };
  }
  if (borrowId != null && borrowId > 0) {
    return { pathname: '/modals/borrows', params: { highlightId: String(borrowId) } };
  }
  return { pathname: '/modals/notifications' };
}

export function initNotificationListeners(onTap: (data: NotificationTapData) => void): () => void {
  if (IS_EXPO_GO) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const { data, id } = parseTapResponse(response);
    if (!claimTap(id)) return;
    onTap(data);
  });
  return () => sub.remove();
}

// The notification tap that launched the app from a killed state, if any.
// Marks it handled so the live listener above won't process it a second time.
export async function getInitialNotificationTap(): Promise<NotificationTapData | null> {
  if (IS_EXPO_GO) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  // The OS keeps returning the same "last response" on every cold start
  // (even a plain tap on the app icon), not just the one that followed the
  // actual notification tap. Clear it so it only ever fires once.
  Notifications.clearLastNotificationResponse();
  if (!response) return null;
  const { data, id } = parseTapResponse(response);
  if (!claimTap(id)) return null;
  return data;
}
