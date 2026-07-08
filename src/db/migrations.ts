import * as FileSystem from 'expo-file-system/legacy';
import { sqlite } from './client';

const DATA_TABLES = [
  'categories', 'expenses', 'bills', 'money_sources',
  'recurring_transactions', 'transfers', 'lends', 'borrows', 'targets', 'category_targets',
];

// Sync columns added by the (now removed) cloud-sync feature. Dropped in v2.
const SYNC_COLUMNS = ['sync_id', 'updated_at', 'deleted_at', 'sync_status', 'user_id'];

function columnExists(table: string, col: string): boolean {
  const rows = sqlite.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some(r => r.name === col);
}

function getSettingSync(key: string): string | null {
  try {
    const row = sqlite.getFirstSync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?`, [key]
    );
    return row?.value ?? null;
  } catch { return null; }
}

function setSettingSync(key: string, value: string): void {
  sqlite.runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

// â”€â”€ v2: drop all cloud-sync columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// One-shot, guarded by a settings flag. Snapshots the DB first as a safety net,
// hard-deletes any soft-deleted rows, drops the sync-related indexes, then drops
// the 5 sync columns from every data table (+ user_id from notification_log).
function dropSyncColumns(): void {
  if (getSettingSync('migration_v2_offline') === 'done') return;

  // Safety snapshot before destructive column drops (best-effort).
  try {
    const docDir = (FileSystem.documentDirectory ?? '').replace('file://', '');
    if (docDir) {
      const snapshot = `${docDir}pre-cloud-removal-backup.db`;
      sqlite.execSync('PRAGMA wal_checkpoint(TRUNCATE);');
      sqlite.execSync(`VACUUM INTO '${snapshot}'`);
    }
  } catch (_e) { /* snapshot failed â€” proceed anyway (no production users) */ }

  // Drop the cloud-era indexes (they reference user_id / deleted_at, which would
  // otherwise block DROP COLUMN).
  for (const idx of [
    'idx_expenses_user_date', 'idx_expenses_category', 'idx_expenses_deleted',
    'idx_bills_user_deleted', 'idx_targets_user_month', 'idx_category_targets_target',
    'idx_lends_user_active', 'idx_money_sources_user', 'idx_recurring_source',
  ]) {
    try { sqlite.execSync(`DROP INDEX IF EXISTS ${idx}`); } catch (_e) {}
  }

  for (const table of DATA_TABLES) {
    // Purge soft-deleted rows before the column that hid them disappears.
    if (columnExists(table, 'deleted_at')) {
      try { sqlite.execSync(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`); } catch (_e) {}
    }
    for (const col of SYNC_COLUMNS) {
      if (columnExists(table, col)) {
        try { sqlite.execSync(`ALTER TABLE ${table} DROP COLUMN ${col}`); } catch (_e) {}
      }
    }
  }

  if (columnExists('notification_log', 'user_id')) {
    try { sqlite.execSync(`ALTER TABLE notification_log DROP COLUMN user_id`); } catch (_e) {}
  }

  setSettingSync('migration_v2_offline', 'done');
}

export function runMigrations() {
  sqlite.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      note TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      frequency TEXT NOT NULL DEFAULT 'monthly',
      due_day INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      notify_days_before INTEGER NOT NULL DEFAULT 1,
      notification_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS salary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      period TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      overall_limit REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS category_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_id INTEGER NOT NULL REFERENCES targets(id),
      category_id INTEGER NOT NULL REFERENCES categories(id),
      limit_amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS money_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      is_custom INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      source_id INTEGER NOT NULL,
      borrower_name TEXT NOT NULL,
      note TEXT,
      lend_date TEXT NOT NULL,
      expected_pay_date TEXT NOT NULL,
      is_paid INTEGER NOT NULL DEFAULT 0,
      paid_date TEXT,
      has_interest INTEGER NOT NULL DEFAULT 0,
      interest_type TEXT,
      interest_value REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS borrows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      receiving_source_id INTEGER NOT NULL,
      repayment_source_id INTEGER NOT NULL,
      lender_name TEXT NOT NULL,
      note TEXT,
      borrow_date TEXT NOT NULL,
      expected_pay_date TEXT NOT NULL,
      is_paid INTEGER NOT NULL DEFAULT 0,
      paid_date TEXT,
      has_interest INTEGER NOT NULL DEFAULT 0,
      interest_type TEXT,
      interest_value REAL,
      notification_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Add source_id columns (ignore if already exists)
  try { sqlite.execSync(`ALTER TABLE expenses ADD COLUMN source_id INTEGER`); } catch (_e) { /* column exists */ }
  try { sqlite.execSync(`ALTER TABLE bills ADD COLUMN source_id INTEGER`); } catch (_e) { /* column exists */ }

  // Create credit_cards table (for users upgrading from a version without it)
  try {
    sqlite.execSync(`
      CREATE TABLE IF NOT EXISTS credit_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        soa_day INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  } catch (_e) { /* table exists */ }
  // Let expenses optionally be paid via a credit card instead of a wallet source
  try { sqlite.execSync(`ALTER TABLE expenses ADD COLUMN credit_card_id INTEGER`); } catch (_e) { /* column exists */ }

  // Add interest columns to lends (ignore if already exists)
  try { sqlite.execSync(`ALTER TABLE lends ADD COLUMN has_interest INTEGER NOT NULL DEFAULT 0`); } catch (_e) { /* column exists */ }
  try { sqlite.execSync(`ALTER TABLE lends ADD COLUMN interest_type TEXT`); } catch (_e) { /* column exists */ }
  try { sqlite.execSync(`ALTER TABLE lends ADD COLUMN interest_value REAL`); } catch (_e) { /* column exists */ }

  // Reverse salary balance contributions (for users who had salary linked to sources)
  try {
    const salaryExists = sqlite.getFirstSync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='salary'`
    );
    if (salaryExists) {
      const salaryRows = sqlite.getAllSync<{ source_id: number; amount: number }>(
        `SELECT source_id, amount FROM salary WHERE source_id IS NOT NULL`
      );
      for (const row of salaryRows) {
        sqlite.runSync(
          `UPDATE money_sources SET balance = balance - ? WHERE id = ?`,
          [row.amount, row.source_id]
        );
      }
      sqlite.execSync(`DROP TABLE IF EXISTS salary`);
    }
  } catch (_e) { /* salary table already gone */ }

  // Create transfers table
  try {
    sqlite.execSync(`
      CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_source_id INTEGER NOT NULL,
        to_source_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        fee REAL NOT NULL DEFAULT 0,
        note TEXT,
        transfer_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  } catch (_e) { /* table exists */ }

  // Create notification_log table
  try {
    sqlite.execSync(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER,
        lend_id INTEGER,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        scheduled_for TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  } catch (_e) {}
  // Add lend_id to existing notification_log tables (for users upgrading)
  try { sqlite.execSync(`ALTER TABLE notification_log ADD COLUMN lend_id INTEGER`); } catch (_e) {}
  // Add borrow_id to existing notification_log tables (for users upgrading)
  try { sqlite.execSync(`ALTER TABLE notification_log ADD COLUMN borrow_id INTEGER`); } catch (_e) {}
  // Add notification_id to lends
  try { sqlite.execSync(`ALTER TABLE lends ADD COLUMN notification_id TEXT`); } catch (_e) {}

  // Create recurring_transactions table
  try {
    sqlite.execSync(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        day_of_month INTEGER,
        next_run_date TEXT NOT NULL,
        last_run_date TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  } catch (_e) { /* table exists */ }

  // Add new predefined sources for existing users
  const newPredefined = [
    { name: 'Maya', type: 'e_wallet', icon: 'cellphone-wireless', color: '#00B4D8' },
    { name: 'UnionBank', type: 'bank', icon: 'bank-outline', color: '#f97316' },
  ];
  for (const src of newPredefined) {
    try {
      sqlite.runSync(
        `INSERT INTO money_sources (name, type, icon, color, is_custom, is_active) SELECT ?, ?, ?, ?, 0, 1 WHERE NOT EXISTS (SELECT 1 FROM money_sources WHERE name = ? AND is_custom = 0)`,
        [src.name, src.type, src.icon, src.color, src.name]
      );
    } catch (_e) { /* ignore */ }
  }

  // â”€â”€ v2: remove all cloud-sync columns (one-shot, guarded) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  dropSyncColumns();

  // â”€â”€ Performance indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sqlite.execSync(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_targets_month ON targets(month);
    CREATE INDEX IF NOT EXISTS idx_category_targets_target ON category_targets(target_id);
    CREATE INDEX IF NOT EXISTS idx_lends_active ON lends(is_paid);
    CREATE INDEX IF NOT EXISTS idx_borrows_active ON borrows(is_paid);
    CREATE INDEX IF NOT EXISTS idx_money_sources_active ON money_sources(is_active);
    CREATE INDEX IF NOT EXISTS idx_notification_log_bill ON notification_log(bill_id);
    CREATE INDEX IF NOT EXISTS idx_notification_log_schedule ON notification_log(scheduled_for, read_at);
    CREATE INDEX IF NOT EXISTS idx_recurring_source ON recurring_transactions(source_id);
    CREATE INDEX IF NOT EXISTS idx_credit_cards_active ON credit_cards(is_active);
    CREATE INDEX IF NOT EXISTS idx_expenses_credit_card ON expenses(credit_card_id);
  `);

  // â”€â”€ Dedup predefined categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  try { dedupPredefinedCategories(); } catch (_e) {}

  // â”€â”€ Dedup predefined money_sources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  try { dedupPredefinedSources(); } catch (_e) {}
}

// â”€â”€ Dedup helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function dedupPredefinedCategories() {
  const dupCatGroups = sqlite.getAllSync<{ name: string }>(
    `SELECT name FROM categories WHERE is_custom = 0 GROUP BY name HAVING COUNT(*) > 1`
  );
  for (const group of dupCatGroups) {
    const rows = sqlite.getAllSync<{ id: number }>(
      `SELECT id FROM categories WHERE is_custom = 0 AND name = ? ORDER BY id ASC`,
      [group.name]
    );
    if (rows.length <= 1) continue;
    const keepId = rows[0].id;
    for (const { id } of rows.slice(1)) {
      sqlite.runSync(`UPDATE expenses         SET category_id = ? WHERE category_id = ?`, [keepId, id]);
      sqlite.runSync(`UPDATE bills            SET category_id = ? WHERE category_id = ?`, [keepId, id]);
      sqlite.runSync(`UPDATE category_targets SET category_id = ? WHERE category_id = ?`, [keepId, id]);
      sqlite.runSync(`DELETE FROM categories WHERE id = ?`, [id]);
    }
  }
}

export function dedupPredefinedSources() {
  const dupGroups = sqlite.getAllSync<{ name: string }>(
    `SELECT name FROM money_sources WHERE is_custom = 0 GROUP BY name HAVING COUNT(*) > 1`
  );
  for (const group of dupGroups) {
    const rows = sqlite.getAllSync<{ id: number }>(
      `SELECT id FROM money_sources WHERE is_custom = 0 AND name = ?`,
      [group.name]
    );
    const scored = rows.map(r => {
      const ref = sqlite.getFirstSync<{ c: number }>(
        `SELECT (
          SELECT COUNT(*) FROM expenses WHERE source_id = ?
        ) + (
          SELECT COUNT(*) FROM bills WHERE source_id = ?
        ) + (
          SELECT COUNT(*) FROM lends WHERE source_id = ?
        ) + (
          SELECT COUNT(*) FROM borrows WHERE receiving_source_id = ? OR repayment_source_id = ?
        ) + (
          SELECT COUNT(*) FROM transfers WHERE from_source_id = ? OR to_source_id = ?
        ) + (
          SELECT COUNT(*) FROM recurring_transactions WHERE source_id = ?
        ) AS c`,
        [r.id, r.id, r.id, r.id, r.id, r.id, r.id, r.id]
      );
      return { id: r.id, refs: ref?.c ?? 0 };
    });
    scored.sort((a, b) => b.refs - a.refs || a.id - b.id);
    for (const { id } of scored.slice(1)) {
      sqlite.runSync(`DELETE FROM money_sources WHERE id = ?`, [id]);
    }
  }
}

const PREDEFINED_CATEGORIES = [
  { name: 'Food & Dining', icon: 'food', color: '#f97316' },
  { name: 'Transport', icon: 'car', color: '#3b82f6' },
  { name: 'Shopping', icon: 'shopping', color: '#ec4899' },
  { name: 'Health', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Utilities', icon: 'lightning-bolt', color: '#eab308' },
  { name: 'Entertainment', icon: 'gamepad-variant', color: '#8b5cf6' },
  { name: 'Education', icon: 'school', color: '#06b6d4' },
  { name: 'Other', icon: 'dots-horizontal', color: '#6b7280' },
];

export function seedCategories() {
  for (const cat of PREDEFINED_CATEGORIES) {
    try {
      sqlite.runSync(
        `INSERT INTO categories (name, icon, color, is_custom)
         SELECT ?, ?, ?, 0
         WHERE NOT EXISTS (
           SELECT 1 FROM categories WHERE name = ? AND is_custom = 0
         )`,
        [cat.name, cat.icon, cat.color, cat.name]
      );
    } catch (_e) {}
  }
}

const PREDEFINED_SOURCES = [
  { name: 'BDO', type: 'bank', icon: 'bank', color: '#0033a0' },
  { name: 'BPI', type: 'bank', icon: 'bank', color: '#d4212c' },
  { name: 'UnionBank', type: 'bank', icon: 'bank-outline', color: '#f97316' },
  { name: 'GCash', type: 'e_wallet', icon: 'cellphone', color: '#007dfe' },
  { name: 'Maya', type: 'e_wallet', icon: 'cellphone-wireless', color: '#00B4D8' },
  { name: 'PayPal', type: 'e_wallet', icon: 'wallet-outline', color: '#003087' },
];

export function seedMoneySources() {
  for (const src of PREDEFINED_SOURCES) {
    try {
      sqlite.runSync(
        `INSERT INTO money_sources (name, type, icon, color, is_custom)
         SELECT ?, ?, ?, ?, 0
         WHERE NOT EXISTS (
           SELECT 1 FROM money_sources WHERE name = ? AND is_custom = 0
         )`,
        [src.name, src.type, src.icon, src.color, src.name]
      );
    } catch (_e) {}
  }
}
