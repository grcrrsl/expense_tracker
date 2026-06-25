/* ============================================================
   routes/transactions.js
   Defines all REST API routes for transactions.
   Each route delegates to the appropriate controller function.
   ============================================================ */

const express = require("express");
const router = express.Router();
const {
  getAllTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");

// GET  /api/transactions        — fetch all transactions
router.get("/", getAllTransactions);

// POST /api/transactions        — create a new transaction
router.post("/", addTransaction);

// PUT  /api/transactions/:id    — update a transaction by id
router.put("/:id", updateTransaction);

// DELETE /api/transactions/:id  — delete a transaction by id
router.delete("/:id", deleteTransaction);

module.exports = router;
