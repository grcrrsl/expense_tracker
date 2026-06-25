/* ============================================================
   controllers/transactionController.js
   All queries now filter by req.user.id so each user only
   sees and modifies their own transactions.
   ============================================================ */

const db = require("../db");

const stmtGetAll  = db.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC");
const stmtInsert  = db.prepare("INSERT INTO transactions (user_id, name, amount, category, type, date) VALUES (?, ?, ?, ?, ?, ?)");
const stmtUpdate  = db.prepare("UPDATE transactions SET name = ?, amount = ?, category = ?, type = ?, date = ? WHERE id = ? AND user_id = ?");
const stmtDelete  = db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?");
const stmtGetById = db.prepare("SELECT * FROM transactions WHERE id = ? AND user_id = ?");

function getAllTransactions(req, res) {
  try {
    const rows = stmtGetAll.all(req.user.id);
    res.json(rows);
  } catch (err) {
    console.error("getAllTransactions error:", err);
    res.status(500).json({ error: "Failed to fetch transactions." });
  }
}

function addTransaction(req, res) {
  const { name, amount, category, type, date } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "")
    return res.status(400).json({ error: "Transaction name is required." });
  if (!amount || isNaN(amount) || Number(amount) <= 0)
    return res.status(400).json({ error: "Amount must be a positive number." });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ error: "Date must be in YYYY-MM-DD format." });
  if (!category || typeof category !== "string")
    return res.status(400).json({ error: "Category is required." });
  if (!["income", "expense"].includes(type))
    return res.status(400).json({ error: "Type must be 'income' or 'expense'." });

  try {
    const result = stmtInsert.run(req.user.id, name.trim(), Math.abs(Number(amount)), category.trim(), type, date);
    const newTx = stmtGetById.get(result.lastInsertRowid, req.user.id);
    res.status(201).json(newTx);
  } catch (err) {
    console.error("addTransaction error:", err);
    res.status(500).json({ error: "Failed to add transaction." });
  }
}

function updateTransaction(req, res) {
  const id = Number(req.params.id);
  const { name, amount, category, type, date } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "")
    return res.status(400).json({ error: "Transaction name is required." });
  if (!amount || isNaN(amount) || Number(amount) <= 0)
    return res.status(400).json({ error: "Amount must be a positive number." });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ error: "Date must be in YYYY-MM-DD format." });
  if (!category || typeof category !== "string")
    return res.status(400).json({ error: "Category is required." });
  if (!["income", "expense"].includes(type))
    return res.status(400).json({ error: "Type must be 'income' or 'expense'." });

  try {
    const result = stmtUpdate.run(name.trim(), Math.abs(Number(amount)), category.trim(), type, date, id, req.user.id);
    if (result.changes === 0)
      return res.status(404).json({ error: "Transaction not found." });
    const updated = stmtGetById.get(id, req.user.id);
    res.json(updated);
  } catch (err) {
    console.error("updateTransaction error:", err);
    res.status(500).json({ error: "Failed to update transaction." });
  }
}

function deleteTransaction(req, res) {
  const id = Number(req.params.id);
  try {
    const result = stmtDelete.run(id, req.user.id);
    if (result.changes === 0)
      return res.status(404).json({ error: "Transaction not found." });
    res.json({ message: "Transaction deleted successfully." });
  } catch (err) {
    console.error("deleteTransaction error:", err);
    res.status(500).json({ error: "Failed to delete transaction." });
  }
}

module.exports = { getAllTransactions, addTransaction, updateTransaction, deleteTransaction };
