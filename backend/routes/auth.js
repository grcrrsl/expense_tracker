/* ============================================================
   routes/auth.js
   Public routes — no authentication required.
   ============================================================ */

const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");

// POST /api/auth/register — create a new account
router.post("/register", register);

// POST /api/auth/login — log in and receive a token
router.post("/login", login);

module.exports = router;
