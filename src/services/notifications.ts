import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
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
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const today = new Date();
  const notifyDay = dueDay - notifyDaysBefore;
  const scheduledDay = notifyDay < 1 ? 1 : notifyDay;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💳 Bill Due Soon',
        body: `${billName} — ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
        }).format(amount)} is due in ${notifyDaysBefore} day(s)`,
        data: { billId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: scheduledDay,
        hour: 9,
        minute: 0,
      },
    });
    return identifier;
  } catch {
    return null;
  }
}

export async function cancelNotification(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
