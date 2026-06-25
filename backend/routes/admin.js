const express = require("express");
const db = require("../db");

const router = express.Router();

/* ==========================================
   DASHBOARD STATS
========================================== */

router.get("/dashboard", (req, res) => {
  try {
    const totalUsers = db
      .prepare("SELECT COUNT(*) AS total FROM users")
      .get().total;

    const totalTransactions = db
      .prepare("SELECT COUNT(*) AS total FROM transactions")
      .get().total;

    const totalIncome = db
      .prepare(
        `
        SELECT IFNULL(SUM(amount),0) AS total
        FROM transactions
        WHERE type='income'
      `,
      )
      .get().total;

    const totalExpense = db
      .prepare(
        `
        SELECT IFNULL(SUM(amount),0) AS total
        FROM transactions
        WHERE type='expense'
      `,
      )
      .get().total;

    res.json({
      totalUsers,
      totalTransactions,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

/* ==========================================
   ALL USERS
========================================== */

router.get("/users", (req, res) => {
  try {
    const users = db
      .prepare(
        `
      SELECT
        id,
        username,
        email,
        created_at
      FROM users
      ORDER BY id DESC
    `,
      )
      .all();

    res.json(users);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

/* ==========================================
   ALL TRANSACTIONS
========================================== */

router.get("/transactions", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT
        transactions.id,
        users.username,
        transactions.name,
        transactions.category,
        transactions.type,
        transactions.amount,
        transactions.date

      FROM transactions

      JOIN users
      ON transactions.user_id = users.id

      ORDER BY transactions.id DESC
    `,
      )
      .all();

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

/* ==========================================
   DELETE TRANSACTION
========================================== */

router.delete("/transactions/:id", (req, res) => {
  try {
    db.prepare(
      `
      DELETE FROM transactions
      WHERE id=?
    `,
    ).run(req.params.id);

    res.json({
      message: "Transaction deleted.",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;
