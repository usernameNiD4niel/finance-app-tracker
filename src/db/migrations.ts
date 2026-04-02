import { sqlite } from './client';

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
  `);

  // Add source_id columns (ignore if already exists)
  try { sqlite.execSync(`ALTER TABLE expenses ADD COLUMN source_id INTEGER`); } catch (_e) { /* column exists */ }
  try { sqlite.execSync(`ALTER TABLE bills ADD COLUMN source_id INTEGER`); } catch (_e) { /* column exists */ }

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

  // ── Cloud sync columns (Phase 1) ─────────────────────────────────────────
  // Add sync_id, updated_at, deleted_at, sync_status to all data tables.
  // ALTER TABLE ignores errors so reruns are safe.
  const SYNC_TABLES = [
    'categories', 'expenses', 'bills', 'money_sources',
    'recurring_transactions', 'transfers', 'lends', 'targets', 'category_targets',
  ];
  for (const table of SYNC_TABLES) {
    try { sqlite.execSync(`ALTER TABLE ${table} ADD COLUMN sync_id TEXT`); } catch (_e) {}
    try { sqlite.execSync(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT`); } catch (_e) {}
    try { sqlite.execSync(`ALTER TABLE ${table} ADD COLUMN deleted_at TEXT`); } catch (_e) {}
    try { sqlite.execSync(`ALTER TABLE ${table} ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'`); } catch (_e) {}
  }

  // Backfill sync_id (UUID v4) for any rows that don't have one yet.
  // Uses SQLite's randomblob() — no JS needed.
  const UUID_EXPR =
    `lower(hex(randomblob(4))) || '-' ||` +
    `lower(hex(randomblob(2))) || '-4' ||` +
    `substr(lower(hex(randomblob(2))),2) || '-' ||` +
    `substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' ||` +
    `lower(hex(randomblob(6)))`;

  for (const table of SYNC_TABLES) {
    // Assign a UUID to every row that doesn't have one
    sqlite.execSync(`UPDATE ${table} SET sync_id = (${UUID_EXPR}) WHERE sync_id IS NULL`);
    // Backfill updated_at from created_at for tables that have it
    if (table !== 'category_targets') {
      sqlite.execSync(`UPDATE ${table} SET updated_at = created_at WHERE updated_at IS NULL`);
    } else {
      // category_targets has no created_at — use current time
      sqlite.execSync(`UPDATE category_targets SET updated_at = datetime('now') WHERE updated_at IS NULL`);
    }
  }

  // ── Phase 2: user_id column ──────────────────────────────────────────────
  // Add user_id to all data tables so each row is owned by a Firebase user.
  // Existing rows get assigned to whoever is currently logged in (first-user claim).
  const USER_TABLES = [
    'categories', 'expenses', 'bills', 'money_sources',
    'recurring_transactions', 'transfers', 'lends', 'targets', 'category_targets',
  ];
  for (const table of USER_TABLES) {
    try { sqlite.execSync(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`); } catch (_e) {}
  }
  // Backfill: assign the stored Firebase UID to all existing rows (if a user was already signed in)
  const uidRow = sqlite.getFirstSync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'firebase_uid'`
  );
  const existingUid = uidRow?.value ?? null;
  if (existingUid) {
    for (const table of USER_TABLES) {
      sqlite.runSync(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`, [existingUid]);
    }
  }

  // ── Dedup predefined money_sources ──────────────────────────────────────────
  // Sync used to insert duplicate predefined sources (BDO, BPI, GCash, Maya, etc.)
  // when the local seeded sync_id differed from Firestore's sync_id. This cleans
  // up any existing duplicates by keeping the row with the most FK references
  // (i.e. the one actual transactions point to) and deleting the orphaned copies.
  try {
    const dupGroups = sqlite.getAllSync<{ name: string; user_id: string | null }>(
      `SELECT name, user_id FROM money_sources WHERE is_custom = 0 GROUP BY name, COALESCE(user_id, '') HAVING COUNT(*) > 1`
    );
    for (const group of dupGroups) {
      const userFilter = group.user_id ? `user_id = '${group.user_id}'` : `user_id IS NULL`;
      const rows = sqlite.getAllSync<{ id: number }>(
        `SELECT id FROM money_sources WHERE is_custom = 0 AND name = ? AND ${userFilter}`,
        [group.name]
      );
      // Count FK references for each candidate row
      const scored = rows.map(r => {
        const ref = sqlite.getFirstSync<{ c: number }>(
          `SELECT (
            SELECT COUNT(*) FROM expenses WHERE source_id = ?
          ) + (
            SELECT COUNT(*) FROM bills WHERE source_id = ?
          ) + (
            SELECT COUNT(*) FROM lends WHERE source_id = ?
          ) + (
            SELECT COUNT(*) FROM transfers WHERE from_source_id = ? OR to_source_id = ?
          ) + (
            SELECT COUNT(*) FROM recurring_transactions WHERE source_id = ?
          ) AS c`,
          [r.id, r.id, r.id, r.id, r.id, r.id]
        );
        return { id: r.id, refs: ref?.c ?? 0 };
      });
      // Keep the row with the most references; break ties by keeping the lowest id (oldest/original)
      scored.sort((a, b) => b.refs - a.refs || a.id - b.id);
      for (const { id } of scored.slice(1)) {
        sqlite.runSync(`DELETE FROM money_sources WHERE id = ?`, [id]);
      }
    }
  } catch (_e) {}
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

export function seedCategories(userId: string | null = null) {
  const existing = sqlite.getFirstSync<{ count: number }>(
    userId
      ? 'SELECT COUNT(*) as count FROM categories WHERE is_custom = 0 AND user_id = ?'
      : 'SELECT COUNT(*) as count FROM categories WHERE is_custom = 0 AND user_id IS NULL',
    userId ? [userId] : []
  );
  if (existing && existing.count > 0) return;

  const stmt = sqlite.prepareSync(
    'INSERT INTO categories (name, icon, color, is_custom, user_id) VALUES (?, ?, ?, 0, ?)'
  );
  for (const cat of PREDEFINED_CATEGORIES) {
    stmt.executeSync(cat.name, cat.icon, cat.color, userId);
  }
  stmt.finalizeSync();
}

const PREDEFINED_SOURCES = [
  { name: 'BDO', type: 'bank', icon: 'bank', color: '#0033a0' },
  { name: 'BPI', type: 'bank', icon: 'bank', color: '#d4212c' },
  { name: 'UnionBank', type: 'bank', icon: 'bank-outline', color: '#f97316' },
  { name: 'GCash', type: 'e_wallet', icon: 'cellphone', color: '#007dfe' },
  { name: 'Maya', type: 'e_wallet', icon: 'cellphone-wireless', color: '#00B4D8' },
  { name: 'PayPal', type: 'e_wallet', icon: 'wallet-outline', color: '#003087' },
];

export function seedMoneySources(userId: string | null = null) {
  const existing = sqlite.getFirstSync<{ count: number }>(
    userId
      ? 'SELECT COUNT(*) as count FROM money_sources WHERE is_custom = 0 AND user_id = ?'
      : 'SELECT COUNT(*) as count FROM money_sources WHERE is_custom = 0 AND user_id IS NULL',
    userId ? [userId] : []
  );
  if (existing && existing.count > 0) return;

  const stmt = sqlite.prepareSync(
    'INSERT INTO money_sources (name, type, icon, color, is_custom, user_id) VALUES (?, ?, ?, ?, 0, ?)'
  );
  for (const src of PREDEFINED_SOURCES) {
    stmt.executeSync(src.name, src.type, src.icon, src.color, userId);
  }
  stmt.finalizeSync();
}
