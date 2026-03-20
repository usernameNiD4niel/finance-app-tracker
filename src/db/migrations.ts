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
  `);
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
