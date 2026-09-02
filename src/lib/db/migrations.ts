/**
 * Ordered schema migrations, tracked by SQLite's `user_version` pragma.
 * Never edit a migration that has shipped - append a new one instead.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
    -- Body weight in pounds, for the protein target. Null until it is set.
    weight_lb     REAL CHECK (weight_lb IS NULL OR weight_lb > 0),
    -- Set while the account still holds a password somebody else chose.
    must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0,1)),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE sessions (
    -- SHA-256 of the cookie token; the raw token never touches disk.
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE INDEX idx_sessions_user ON sessions(user_id);

  -- One row per thing logged. A day's 800g of vegetables is however many rows
  -- it took to get there, so the amount is always a positive whole number in
  -- the metric's own unit: minutes, steps, or grams.
  CREATE TABLE entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_id  TEXT NOT NULL,
    date       TEXT NOT NULL,
    amount     INTEGER NOT NULL CHECK (amount > 0),
    notes      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_entries_user_date ON entries(user_id, date);
  CREATE INDEX idx_entries_user_metric ON entries(user_id, metric_id, date);
  `,
];
