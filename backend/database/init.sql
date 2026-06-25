-- ============================================================
-- DATABASE INITIALIZATION SCRIPT (v2 — with Auth)
-- ============================================================

-- USERS TABLE
-- Stores registered accounts. Passwords are hashed (never plain text).
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    NOT NULL UNIQUE,
  email      TEXT    NOT NULL UNIQUE,
  password   TEXT    NOT NULL,
  created_at TEXT    DEFAULT (date('now'))
);

-- TRANSACTIONS TABLE (now scoped per user)
CREATE TABLE IF NOT EXISTS transactions (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name     TEXT    NOT NULL,
  amount   REAL    NOT NULL,
  category TEXT    NOT NULL,
  type     TEXT    NOT NULL,
  date     TEXT    NOT NULL
);

-- SETTINGS TABLE (one row per user, keyed by user_id)
CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  budget  REAL    DEFAULT 0,
  theme   TEXT    DEFAULT 'dark'
);
