/* ============================================================
   db.js — DATABASE CONNECTION
   Uses Node.js built-in SQLite (node:sqlite) — Node v22.5+
   ============================================================ */

const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "database.db");
const SQL_INIT_PATH = path.join(__dirname, "database", "init.sql");

const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;"); // enforce user_id references

const initSQL = fs.readFileSync(SQL_INIT_PATH, "utf8");
db.exec(initSQL);

console.log("✅ Database connected and initialized:", DB_PATH);

module.exports = db;
