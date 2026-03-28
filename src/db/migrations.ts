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
  const existing = sqlite.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE is_custom = 0'
  );
  if (existing && existing.count > 0) return;

  const stmt = sqlite.prepareSync(
    'INSERT INTO categories (name, icon, color, is_custom) VALUES (?, ?, ?, 0)'
  );
  for (const cat of PREDEFINED_CATEGORIES) {
    stmt.executeSync(cat.name, cat.icon, cat.color);
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

export function seedMoneySources() {
  const existing = sqlite.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM money_sources WHERE is_custom = 0'
  );
  if (existing && existing.count > 0) return;

  const stmt = sqlite.prepareSync(
    'INSERT INTO money_sources (name, type, icon, color, is_custom) VALUES (?, ?, ?, ?, 0)'
  );
  for (const src of PREDEFINED_SOURCES) {
    stmt.executeSync(src.name, src.type, src.icon, src.color);
  }
  stmt.finalizeSync();
}
