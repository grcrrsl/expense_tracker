/* ============================================================
   routes/settings.js
   Defines all REST API routes for settings.
   ============================================================ */

const express = require("express");
const router = express.Router();
const { getSettings, updateSettings } = require("../controllers/settingsController");

// GET /api/settings   — fetch current settings
router.get("/", getSettings);

// PUT /api/settings   — update settings (budget and/or theme)
router.put("/", updateSettings);

module.exports = router;
