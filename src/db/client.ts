import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = SQLite.openDatabaseSync('finance_tracker.db');
export const db = drizzle(sqlite, { schema });
export { sqlite };

const USER_TABLES = [
  'categories', 'expenses', 'bills', 'money_sources',
  'recurring_transactions', 'transfers', 'lends', 'targets', 'category_targets',
];

/** Delete all synced rows belonging to a user (call after successful sync + logout). */
export function clearUserData(uid: string): void {
  for (const table of USER_TABLES) {
    sqlite.runSync(
      `DELETE FROM ${table} WHERE user_id = ? AND sync_status = 'synced'`,
      [uid],
    );
  }
}

/** Count all pending (unsynced) rows belonging to a user. */
export function countPendingChanges(uid: string): number {
  let total = 0;
  for (const table of USER_TABLES) {
    const row = sqlite.getFirstSync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE sync_status = 'pending' AND user_id = ?`,
      [uid],
    );
    total += row?.cnt ?? 0;
  }
  return total;
}
