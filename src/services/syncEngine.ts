/**
 * Sync Engine — pushes local SQLite changes to Firestore and pulls remote changes back.
 *
 * Architecture:
 *  - Local SQLite is the primary DB (always used, even offline)
 *  - Firestore is the cloud mirror (synced when online)
 *  - Every write to SQLite sets sync_status = 'pending'
 *  - On sync: pull remote first (last-write-wins), then push local pending rows
 *
 * Firestore Security Rules to deploy via Firebase Console → Firestore → Rules:
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /users/{uid}/{document=**} {
 *         allow read, write: if request.auth != null && request.auth.uid == uid;
 *       }
 *     }
 *   }
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { sqlite } from '../db/client';

export type SyncResult = { pushed: number; pulled: number; error?: string };

// ─── Low-level helpers ──────────────────────────────────────────────────────

/** Get the sync_id (UUID) for a local integer row ID in the given SQLite table. */
function syncIdOf(table: string, localId: number | null | undefined): string | null {
  if (!localId) return null;
  const row = sqlite.getFirstSync<{ sync_id: string }>(
    `SELECT sync_id FROM ${table} WHERE id = ?`, [localId]
  );
  return row?.sync_id ?? null;
}

/** Get the local integer row ID for a sync_id UUID in the given SQLite table. */
function localIdOf(table: string, syncId: string | null | undefined): number | null {
  if (!syncId) return null;
  const row = sqlite.getFirstSync<{ id: number }>(
    `SELECT id FROM ${table} WHERE sync_id = ?`, [syncId]
  );
  return row?.id ?? null;
}

/** Returns true if the remote timestamp is strictly newer than the local one. */
function isNewer(remoteTs: string, localTs: string | null | undefined): boolean {
  if (!localTs) return true;
  return remoteTs > localTs; // ISO 8601 strings compare correctly lexicographically
}

type PushItem = { ref: DocumentReference; data: Record<string, unknown>; syncId: string; table: string };

/** Commit push items to Firestore in chunks ≤ 499 (Firestore batch limit). */
async function commitInBatches(items: PushItem[]): Promise<void> {
  const CHUNK = 499;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(firestore);
    for (const item of items.slice(i, i + CHUNK)) {
      batch.set(item.ref, item.data);
    }
    await batch.commit();
  }
}

/** After a successful Firestore commit, mark all pushed rows as 'synced' in SQLite. */
function markSynced(items: PushItem[]): void {
  const byTable = new Map<string, string[]>();
  for (const { table, syncId } of items) {
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table)!.push(syncId);
  }
  for (const [table, ids] of byTable) {
    const placeholders = ids.map(() => '?').join(',');
    sqlite.runSync(
      `UPDATE ${table} SET sync_status = 'synced' WHERE sync_id IN (${placeholders})`,
      ids
    );
  }
}

// ─── Push helpers (SQLite → Firestore) ─────────────────────────────────────

function collectPendingCategories(uid: string): PushItem[] {
  const rows = sqlite.getAllSync<any>(`SELECT * FROM categories WHERE sync_status = 'pending' AND (user_id = ? OR user_id IS NULL)`, [uid]);
  return rows.map(r => ({
    ref: doc(firestore, 'users', uid, 'categories', r.sync_id),
    data: { name: r.name, icon: r.icon, color: r.color, isCustom: r.is_custom === 1,
            createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? null },
    syncId: r.sync_id,
    table: 'categories',
  }));
}

function collectPendingMoneySources(uid: string): PushItem[] {
  const rows = sqlite.getAllSync<any>(`SELECT * FROM money_sources WHERE sync_status = 'pending' AND (user_id = ? OR user_id IS NULL)`, [uid]);
  return rows.map(r => ({
    ref: doc(firestore, 'users', uid, 'moneySources', r.sync_id),
    data: { name: r.name, type: r.type, icon: r.icon, color: r.color,
            balance: r.balance, isCustom: r.is_custom === 1, isActive: r.is_active === 1,
            createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? null },
    syncId: r.sync_id,
    table: 'money_sources',
  }));
}

function collectPendingTargets(uid: string): PushItem[] {
  const rows = sqlite.getAllSync<any>(`SELECT * FROM targets WHERE sync_status = 'pending' AND (user_id = ? OR user_id IS NULL)`, [uid]);
  return rows.map(r => ({
    ref: doc(firestore, 'users', uid, 'targets', r.sync_id),
    data: { month: r.month, overallLimit: r.overall_limit ?? null,
            createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? null },
    syncId: r.sync_id,
    table: 'targets',
  }));
}

function collectPendingBills(uid: string): PushItem[] {
  const rows = sqlite.getAllSync<any>(`SELECT * FROM bills WHERE sync_status = 'pending' AND (user_id = ? OR user_id IS NULL)`, [uid]);
  return rows.flatMap(r => {
    const categorySyncId = syncIdOf('categories', r.category_id);
    const sourceSyncId = syncIdOf('money_sources', r.source_id);
    if (!categorySyncId) return []; // FK not resolvable — skip
    return [{
      ref: doc(firestore, 'users', uid, 'bills', r.sync_id),
      data: { name: r.name, amount: r.amount, categoryId: categorySyncId,
              sourceId: sourceSyncId ?? null, frequency: r.frequency, dueDay: r.due_day,
              isActive: r.is_active === 1, notifyDaysBefore: r.notify_days_before,
              notificationId: r.notification_id ?? null,
              createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? null },
      syncId: r.sync_id,
      table: 'bills',
    }];
  });
}

function collectPendingLends(uid: string): PushItem[] {
  const rows = sqlite.getAllSync<any>(`SELECT * FROM lends WHERE sync_status = 'pending' AND (user_id = ? OR user_id IS NULL)`, [uid]);
  return rows.flatMap(r => {
    const sourceSyncId = syncIdOf('money_sources', r.source_id);
    if (!sourceSyncId) return [];
    return [{
      ref: doc(firestore, 'users', uid, 'lends', r.sync_id),
      data: { amount: r.amount, sourceId: sourceSyncId, borrowerName: r.borrower_name,
              note: r.note ?? null, lendDate: r.lend_date, expectedPayDate: r.expected_pay_date,
              isPaid: r.is_paid === 1, paidDate: r.paid_date ?? null,
              hasInterest: r.has_interest === 1, interestType: r.interest_type ?? null,
              interestValue: r.interest_value ?? null,
              createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? null },
      syncId: r.sync_id,
      table: 'lends',
    }];
  });
}

function collectPendingRecurring(uid: string): PushItem[] {
  const rows = sqlite.getAllSync<any>(`SELECT * FROM recurring_transactions WHERE sync_status = 'pending' AND (user_id = ? OR user_id IS NULL)`, [uid]);
  return rows.flatMap(r => {
    const sourceSyncId = syncIdOf('money_sources', r.source_id);
    if (!sourceSyncId) return [];
    return [{
      ref: doc(firestore, 'users', uid, 'recurringTransactions', r.sync_id),
      data: { sourceId: sourceSyncId, type: r.type, amount: r.amount, frequency: r.frequency,
              dayOfMonth: r.day_of_month ?? null, nextRunDate: r.next_run_date,
              lastRunDate: r.last_run_date ?? null, isActive: r.is_active === 1,
              note: r.note ?? null,
              createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? null },
      syncId: r.sync_id,
      table: 'recurring_transactions',
    }];
  });
}

function collectPendingExpenses(uid: string): PushItem[] {
  const rows = sqlite.getAllSync<any>(`SELECT * FROM expenses WHERE sync_status = 'pending' AND (user_id = ? OR user_id IS NULL)`, [uid]);
  return rows.flatMap(r => {
    const categorySyncId = syncIdOf('categories', r.category_id);
    const sourceSyncId = syncIdOf('money_sources', r.source_id);
    if (!categorySyncId) return [];
    return [{
      ref: doc(firestore, 'users', uid, 'expenses', r.sync_id),
      data: { amount: r.amount, categoryId: categorySyncId, sourceId: sourceSyncId ?? null,
              note: r.note ?? null, date: r.date,
              createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? null },
      syncId: r.sync_id,
      table: 'expenses',
    }];
  });
}

function collectPendingTransfers(uid: string): PushItem[] {
  const rows = sqlite.getAllSync<any>(`SELECT * FROM transfers WHERE sync_status = 'pending' AND (user_id = ? OR user_id IS NULL)`, [uid]);
  return rows.flatMap(r => {
    const fromSyncId = syncIdOf('money_sources', r.from_source_id);
    const toSyncId = syncIdOf('money_sources', r.to_source_id);
    if (!fromSyncId || !toSyncId) return [];
    return [{
      ref: doc(firestore, 'users', uid, 'transfers', r.sync_id),
      data: { fromSourceId: fromSyncId, toSourceId: toSyncId, amount: r.amount,
              fee: r.fee, note: r.note ?? null, transferDate: r.transfer_date,
              createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? null },
      syncId: r.sync_id,
      table: 'transfers',
    }];
  });
}

function collectPendingCategoryTargets(uid: string): PushItem[] {
  const rows = sqlite.getAllSync<any>(`SELECT * FROM category_targets WHERE sync_status = 'pending' AND (user_id = ? OR user_id IS NULL)`, [uid]);
  return rows.flatMap(r => {
    const targetSyncId = syncIdOf('targets', r.target_id);
    const categorySyncId = syncIdOf('categories', r.category_id);
    if (!targetSyncId || !categorySyncId) return [];
    return [{
      ref: doc(firestore, 'users', uid, 'categoryTargets', r.sync_id),
      data: { targetId: targetSyncId, categoryId: categorySyncId, limitAmount: r.limit_amount,
              updatedAt: r.updated_at, deletedAt: r.deleted_at ?? null },
      syncId: r.sync_id,
      table: 'category_targets',
    }];
  });
}

// ─── Pull helpers (Firestore → SQLite) ─────────────────────────────────────

async function pullCategories(uid: string, since: string | null): Promise<number> {
  const col = collection(firestore, 'users', uid, 'categories');
  const q = since ? query(col, where('updatedAt', '>', since)) : col;
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM categories WHERE sync_id = ?`, [d.id]
    );
    if (existing) {
      if (isNewer(data.updatedAt, existing.updated_at)) {
        sqlite.runSync(`UPDATE categories SET name=?, icon=?, color=?, is_custom=?, updated_at=?, deleted_at=?, user_id=?, sync_status='synced' WHERE id=?`,
          [data.name, data.icon, data.color, data.isCustom ? 1 : 0, data.updatedAt, data.deletedAt ?? null, uid, existing.id]);
        count++;
      }
    } else {
      sqlite.runSync(`INSERT INTO categories (name, icon, color, is_custom, created_at, sync_id, updated_at, deleted_at, user_id, sync_status) VALUES (?,?,?,?,?,?,?,?,?,'synced')`,
        [data.name, data.icon, data.color, data.isCustom ? 1 : 0, data.createdAt, d.id, data.updatedAt, data.deletedAt ?? null, uid]);
      count++;
    }
  }
  return count;
}

async function pullMoneySources(uid: string, since: string | null): Promise<number> {
  const col = collection(firestore, 'users', uid, 'moneySources');
  const q = since ? query(col, where('updatedAt', '>', since)) : col;
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    let existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM money_sources WHERE sync_id = ?`, [d.id]
    );
    // For predefined (non-custom) sources, also check by name+user to avoid duplicating
    // locally-seeded rows that have a different sync_id than what's in Firestore.
    if (!existing && !data.isCustom) {
      existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
        `SELECT id, updated_at FROM money_sources WHERE name = ? AND is_custom = 0 AND user_id = ?`,
        [data.name, uid]
      );
      if (existing) {
        // Align the local sync_id with Firestore so future syncs match correctly.
        sqlite.runSync(`UPDATE money_sources SET sync_id = ? WHERE id = ?`, [d.id, existing.id]);
      }
    }
    if (existing) {
      if (isNewer(data.updatedAt, existing.updated_at)) {
        sqlite.runSync(`UPDATE money_sources SET name=?, type=?, icon=?, color=?, balance=?, is_custom=?, is_active=?, updated_at=?, deleted_at=?, user_id=?, sync_status='synced' WHERE id=?`,
          [data.name, data.type, data.icon, data.color, data.balance, data.isCustom ? 1 : 0, data.isActive ? 1 : 0, data.updatedAt, data.deletedAt ?? null, uid, existing.id]);
        count++;
      }
    } else {
      sqlite.runSync(`INSERT INTO money_sources (name, type, icon, color, balance, is_custom, is_active, created_at, sync_id, updated_at, deleted_at, user_id, sync_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'synced')`,
        [data.name, data.type, data.icon, data.color, data.balance, data.isCustom ? 1 : 0, data.isActive ? 1 : 0, data.createdAt, d.id, data.updatedAt, data.deletedAt ?? null, uid]);
      count++;
    }
  }
  return count;
}

async function pullTargets(uid: string, since: string | null): Promise<number> {
  const col = collection(firestore, 'users', uid, 'targets');
  const q = since ? query(col, where('updatedAt', '>', since)) : col;
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM targets WHERE sync_id = ?`, [d.id]
    );
    if (existing) {
      if (isNewer(data.updatedAt, existing.updated_at)) {
        sqlite.runSync(`UPDATE targets SET month=?, overall_limit=?, updated_at=?, deleted_at=?, user_id=?, sync_status='synced' WHERE id=?`,
          [data.month, data.overallLimit ?? null, data.updatedAt, data.deletedAt ?? null, uid, existing.id]);
        count++;
      }
    } else {
      sqlite.runSync(`INSERT INTO targets (month, overall_limit, created_at, sync_id, updated_at, deleted_at, user_id, sync_status) VALUES (?,?,?,?,?,?,?,'synced')`,
        [data.month, data.overallLimit ?? null, data.createdAt, d.id, data.updatedAt, data.deletedAt ?? null, uid]);
      count++;
    }
  }
  return count;
}

async function pullBills(uid: string, since: string | null): Promise<number> {
  const col = collection(firestore, 'users', uid, 'bills');
  const q = since ? query(col, where('updatedAt', '>', since)) : col;
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const categoryId = localIdOf('categories', data.categoryId);
    const sourceId = localIdOf('money_sources', data.sourceId);
    if (!categoryId) continue; // FK not resolved yet
    const existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM bills WHERE sync_id = ?`, [d.id]
    );
    if (existing) {
      if (isNewer(data.updatedAt, existing.updated_at)) {
        sqlite.runSync(`UPDATE bills SET name=?, amount=?, category_id=?, source_id=?, frequency=?, due_day=?, is_active=?, notify_days_before=?, notification_id=?, updated_at=?, deleted_at=?, user_id=?, sync_status='synced' WHERE id=?`,
          [data.name, data.amount, categoryId, sourceId ?? null, data.frequency, data.dueDay, data.isActive ? 1 : 0, data.notifyDaysBefore, data.notificationId ?? null, data.updatedAt, data.deletedAt ?? null, uid, existing.id]);
        count++;
      }
    } else {
      sqlite.runSync(`INSERT INTO bills (name, amount, category_id, source_id, frequency, due_day, is_active, notify_days_before, notification_id, created_at, sync_id, updated_at, deleted_at, user_id, sync_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')`,
        [data.name, data.amount, categoryId, sourceId ?? null, data.frequency, data.dueDay, data.isActive ? 1 : 0, data.notifyDaysBefore, data.notificationId ?? null, data.createdAt, d.id, data.updatedAt, data.deletedAt ?? null, uid]);
      count++;
    }
  }
  return count;
}

async function pullLends(uid: string, since: string | null): Promise<number> {
  const col = collection(firestore, 'users', uid, 'lends');
  const q = since ? query(col, where('updatedAt', '>', since)) : col;
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const sourceId = localIdOf('money_sources', data.sourceId);
    if (!sourceId) continue;
    const existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM lends WHERE sync_id = ?`, [d.id]
    );
    if (existing) {
      if (isNewer(data.updatedAt, existing.updated_at)) {
        sqlite.runSync(`UPDATE lends SET amount=?, source_id=?, borrower_name=?, note=?, lend_date=?, expected_pay_date=?, is_paid=?, paid_date=?, has_interest=?, interest_type=?, interest_value=?, updated_at=?, deleted_at=?, user_id=?, sync_status='synced' WHERE id=?`,
          [data.amount, sourceId, data.borrowerName, data.note ?? null, data.lendDate, data.expectedPayDate, data.isPaid ? 1 : 0, data.paidDate ?? null, data.hasInterest ? 1 : 0, data.interestType ?? null, data.interestValue ?? null, data.updatedAt, data.deletedAt ?? null, uid, existing.id]);
        count++;
      }
    } else {
      sqlite.runSync(`INSERT INTO lends (amount, source_id, borrower_name, note, lend_date, expected_pay_date, is_paid, paid_date, has_interest, interest_type, interest_value, created_at, sync_id, updated_at, deleted_at, user_id, sync_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')`,
        [data.amount, sourceId, data.borrowerName, data.note ?? null, data.lendDate, data.expectedPayDate, data.isPaid ? 1 : 0, data.paidDate ?? null, data.hasInterest ? 1 : 0, data.interestType ?? null, data.interestValue ?? null, data.createdAt, d.id, data.updatedAt, data.deletedAt ?? null, uid]);
      count++;
    }
  }
  return count;
}

async function pullRecurring(uid: string, since: string | null): Promise<number> {
  const col = collection(firestore, 'users', uid, 'recurringTransactions');
  const q = since ? query(col, where('updatedAt', '>', since)) : col;
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const sourceId = localIdOf('money_sources', data.sourceId);
    if (!sourceId) continue;
    const existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM recurring_transactions WHERE sync_id = ?`, [d.id]
    );
    if (existing) {
      if (isNewer(data.updatedAt, existing.updated_at)) {
        sqlite.runSync(`UPDATE recurring_transactions SET source_id=?, type=?, amount=?, frequency=?, day_of_month=?, next_run_date=?, last_run_date=?, is_active=?, note=?, updated_at=?, deleted_at=?, user_id=?, sync_status='synced' WHERE id=?`,
          [sourceId, data.type, data.amount, data.frequency, data.dayOfMonth ?? null, data.nextRunDate, data.lastRunDate ?? null, data.isActive ? 1 : 0, data.note ?? null, data.updatedAt, data.deletedAt ?? null, uid, existing.id]);
        count++;
      }
    } else {
      sqlite.runSync(`INSERT INTO recurring_transactions (source_id, type, amount, frequency, day_of_month, next_run_date, last_run_date, is_active, note, created_at, sync_id, updated_at, deleted_at, user_id, sync_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')`,
        [sourceId, data.type, data.amount, data.frequency, data.dayOfMonth ?? null, data.nextRunDate, data.lastRunDate ?? null, data.isActive ? 1 : 0, data.note ?? null, data.createdAt, d.id, data.updatedAt, data.deletedAt ?? null, uid]);
      count++;
    }
  }
  return count;
}

async function pullExpenses(uid: string, since: string | null): Promise<number> {
  const col = collection(firestore, 'users', uid, 'expenses');
  const q = since ? query(col, where('updatedAt', '>', since)) : col;
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const categoryId = localIdOf('categories', data.categoryId);
    const sourceId = localIdOf('money_sources', data.sourceId);
    if (!categoryId) continue;
    const existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM expenses WHERE sync_id = ?`, [d.id]
    );
    if (existing) {
      if (isNewer(data.updatedAt, existing.updated_at)) {
        sqlite.runSync(`UPDATE expenses SET amount=?, category_id=?, source_id=?, note=?, date=?, updated_at=?, deleted_at=?, user_id=?, sync_status='synced' WHERE id=?`,
          [data.amount, categoryId, sourceId ?? null, data.note ?? null, data.date, data.updatedAt, data.deletedAt ?? null, uid, existing.id]);
        count++;
      }
    } else {
      sqlite.runSync(`INSERT INTO expenses (amount, category_id, source_id, note, date, created_at, sync_id, updated_at, deleted_at, user_id, sync_status) VALUES (?,?,?,?,?,?,?,?,?,?,'synced')`,
        [data.amount, categoryId, sourceId ?? null, data.note ?? null, data.date, data.createdAt, d.id, data.updatedAt, data.deletedAt ?? null, uid]);
      count++;
    }
  }
  return count;
}

async function pullTransfers(uid: string, since: string | null): Promise<number> {
  const col = collection(firestore, 'users', uid, 'transfers');
  const q = since ? query(col, where('updatedAt', '>', since)) : col;
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const fromSourceId = localIdOf('money_sources', data.fromSourceId);
    const toSourceId = localIdOf('money_sources', data.toSourceId);
    if (!fromSourceId || !toSourceId) continue;
    const existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM transfers WHERE sync_id = ?`, [d.id]
    );
    if (existing) {
      if (isNewer(data.updatedAt, existing.updated_at)) {
        sqlite.runSync(`UPDATE transfers SET from_source_id=?, to_source_id=?, amount=?, fee=?, note=?, transfer_date=?, updated_at=?, deleted_at=?, user_id=?, sync_status='synced' WHERE id=?`,
          [fromSourceId, toSourceId, data.amount, data.fee, data.note ?? null, data.transferDate, data.updatedAt, data.deletedAt ?? null, uid, existing.id]);
        count++;
      }
    } else {
      sqlite.runSync(`INSERT INTO transfers (from_source_id, to_source_id, amount, fee, note, transfer_date, created_at, sync_id, updated_at, deleted_at, user_id, sync_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'synced')`,
        [fromSourceId, toSourceId, data.amount, data.fee, data.note ?? null, data.transferDate, data.createdAt, d.id, data.updatedAt, data.deletedAt ?? null, uid]);
      count++;
    }
  }
  return count;
}

async function pullCategoryTargets(uid: string, since: string | null): Promise<number> {
  const col = collection(firestore, 'users', uid, 'categoryTargets');
  const q = since ? query(col, where('updatedAt', '>', since)) : col;
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const targetId = localIdOf('targets', data.targetId);
    const categoryId = localIdOf('categories', data.categoryId);
    if (!targetId || !categoryId) continue;
    const existing = sqlite.getFirstSync<{ id: number; updated_at: string }>(
      `SELECT id, updated_at FROM category_targets WHERE sync_id = ?`, [d.id]
    );
    if (existing) {
      if (isNewer(data.updatedAt, existing.updated_at)) {
        sqlite.runSync(`UPDATE category_targets SET target_id=?, category_id=?, limit_amount=?, updated_at=?, deleted_at=?, user_id=?, sync_status='synced' WHERE id=?`,
          [targetId, categoryId, data.limitAmount, data.updatedAt, data.deletedAt ?? null, uid, existing.id]);
        count++;
      }
    } else {
      sqlite.runSync(`INSERT INTO category_targets (target_id, category_id, limit_amount, sync_id, updated_at, deleted_at, user_id, sync_status) VALUES (?,?,?,?,?,?,?,'synced')`,
        [targetId, categoryId, data.limitAmount, d.id, data.updatedAt, data.deletedAt ?? null, uid]);
      count++;
    }
  }
  return count;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Push-only: uploads all local pending rows to Firestore without pulling.
 * Used for immediate push after each mutation when the user is online.
 */
export async function pushPending(uid: string): Promise<number> {
  const allItems: PushItem[] = [
    ...collectPendingCategories(uid),
    ...collectPendingMoneySources(uid),
    ...collectPendingTargets(uid),
    ...collectPendingBills(uid),
    ...collectPendingLends(uid),
    ...collectPendingRecurring(uid),
    ...collectPendingExpenses(uid),
    ...collectPendingTransfers(uid),
    ...collectPendingCategoryTargets(uid),
  ];
  if (allItems.length === 0) return 0;
  await commitInBatches(allItems);
  markSynced(allItems);
  return allItems.length;
}

/**
 * Full sync: pull remote changes first (so we don't overwrite newer remote data),
 * then push local pending changes up to Firestore.
 */
export async function runSync(uid: string): Promise<SyncResult> {
  const lastSyncedAt = sqlite.getFirstSync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'last_synced_at'`
  )?.value ?? null;

  let pulled = 0;
  let pushed = 0;

  try {
    // ── Pull (FK dependency order) ──────────────────────────────────────────
    pulled += await pullCategories(uid, lastSyncedAt);
    pulled += await pullMoneySources(uid, lastSyncedAt);
    pulled += await pullTargets(uid, lastSyncedAt);
    pulled += await pullBills(uid, lastSyncedAt);
    pulled += await pullLends(uid, lastSyncedAt);
    pulled += await pullRecurring(uid, lastSyncedAt);
    pulled += await pullExpenses(uid, lastSyncedAt);
    pulled += await pullTransfers(uid, lastSyncedAt);
    pulled += await pullCategoryTargets(uid, lastSyncedAt);

    // ── Push (any order — Firestore documents are independent) ───────────────
    const allItems: PushItem[] = [
      ...collectPendingCategories(uid),
      ...collectPendingMoneySources(uid),
      ...collectPendingTargets(uid),
      ...collectPendingBills(uid),
      ...collectPendingLends(uid),
      ...collectPendingRecurring(uid),
      ...collectPendingExpenses(uid),
      ...collectPendingTransfers(uid),
      ...collectPendingCategoryTargets(uid),
    ];

    if (allItems.length > 0) {
      await commitInBatches(allItems);
      markSynced(allItems);
      pushed = allItems.length;
    }

    // ── Update lastSyncedAt ─────────────────────────────────────────────────
    const now = new Date().toISOString();
    sqlite.runSync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('last_synced_at', ?)`, [now]);

    return { pushed, pulled };
  } catch (e: any) {
    console.warn('[sync] Sync failed:', e?.message ?? e);
    return { pushed, pulled, error: e?.message ?? 'Unknown sync error' };
  }
}
