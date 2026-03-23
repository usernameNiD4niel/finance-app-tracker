import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo) return false;
  const Notifications = require('expo-notifications');
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleBillNotification(
  billId: number,
  billName: string,
  amount: number,
  dueDay: number,
  notifyDaysBefore: number,
  currency: string
): Promise<string | null> {
  if (isExpoGo) return null;
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const Notifications = require('expo-notifications');
  const notifyDay = dueDay - notifyDaysBefore;
  const scheduledDay = notifyDay < 1 ? 1 : notifyDay;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '💳 Bill Due Soon',
        body: `${billName} — ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
        }).format(amount)} is due in ${notifyDaysBefore} day(s)`,
        data: {billId},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: scheduledDay,
        hour: 9,
        minute: 0,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelNotification(notificationId: string) {
  if (isExpoGo) return;
  const Notifications = require('expo-notifications');
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications() {
  if (isExpoGo) return;
  const Notifications = require('expo-notifications');
  await Notifications.cancelAllScheduledNotificationsAsync();
}
