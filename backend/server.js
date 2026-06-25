/* ============================================================
   server.js — MAIN EXPRESS SERVER (v2 with Auth)
   ============================================================ */

const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes        = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");
const settingsRoutes    = require("./routes/settings");
const requireAuth       = require("./middleware/auth");
const errorHandler      = require("./middleware/errorHandler");
const adminRoutes = require("./routes/admin");


require("./db"); // initialize database on startup

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──────────────────────────────────────────────
app.use(
  cors({
    origin: "https://expense-tracker-seven-hazel-79.vercel.app",
    credentials: true,
  }),
);
app.use(express.json());

// Serve frontend static files
const FRONTEND_PATH = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_PATH));

// ── PUBLIC ROUTES (no login required) ──────────────────────
app.use("/api/auth", authRoutes);

// ── PROTECTED ROUTES (JWT required) ────────────────────────
// requireAuth middleware checks the token before every request
app.use("/api/transactions", requireAuth, transactionRoutes);
app.use("/api/settings",     requireAuth, settingsRoutes);
app.use("/api/admin", requireAuth, adminRoutes);

// ── CATCH-ALL — serve the frontend ─────────────────────────
app.get("{*splat}", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "index.html"));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   💰 Expense Tracker Backend v2       ║
  ║   Server running on port ${PORT}         ║
  ║   Open: http://localhost:${PORT}         ║
  ╚═══════════════════════════════════════╝
  `);
});
