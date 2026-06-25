/* ============================================================
   controllers/settingsController.js
   Settings are now per-user, keyed by user_id.
   ============================================================ */

const db = require("../db");

const stmtGetSettings    = db.prepare("SELECT * FROM settings WHERE user_id = ?");
const stmtUpsertSettings = db.prepare(
  "INSERT INTO settings (user_id, budget, theme) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET budget = excluded.budget, theme = excluded.theme"
);

function getSettings(req, res) {
  try {
    let settings = stmtGetSettings.get(req.user.id);
    // If no settings row exists yet, return defaults
    if (!settings) settings = { user_id: req.user.id, budget: 0, theme: "dark" };
    res.json(settings);
  } catch (err) {
    console.error("getSettings error:", err);
    res.status(500).json({ error: "Failed to fetch settings." });
  }
}

function updateSettings(req, res) {
  const { budget, theme } = req.body;

  if (budget !== undefined && (isNaN(budget) || Number(budget) < 0))
    return res.status(400).json({ error: "Budget must be a non-negative number." });
  if (theme !== undefined && !["dark", "light"].includes(theme))
    return res.status(400).json({ error: "Theme must be 'dark' or 'light'." });

  try {
    let current = stmtGetSettings.get(req.user.id) || { budget: 0, theme: "dark" };
    const newBudget = budget !== undefined ? Number(budget) : current.budget;
    const newTheme  = theme  !== undefined ? theme           : current.theme;

    stmtUpsertSettings.run(req.user.id, newBudget, newTheme);
    res.json({ user_id: req.user.id, budget: newBudget, theme: newTheme });
  } catch (err) {
    console.error("updateSettings error:", err);
    res.status(500).json({ error: "Failed to update settings." });
  }
}

module.exports = { getSettings, updateSettings };
