import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { processDueBills } from './billCharging';

export const BILL_CHARGE_TASK = 'BILL_CHARGE_TASK';

TaskManager.defineTask(BILL_CHARGE_TASK, async () => {
  try {
    await processDueBills();
  } catch (e) {
    console.warn('[BillChargeTask] failed:', e);
  }
});

export async function registerBillChargeTask(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BILL_CHARGE_TASK);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(BILL_CHARGE_TASK, {
        minimumInterval: 15 * 60,
      });
    }
  } catch (e) {
    // Background tasks require a dev build — silently skip in Expo Go
    console.warn('[registerBillChargeTask] skipped:', e);
  }
}
