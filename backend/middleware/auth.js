/* ============================================================
   middleware/auth.js — JWT AUTHENTICATION MIDDLEWARE
   Protects all routes that require a logged-in user.
   Reads the token from the Authorization header and verifies it.
   If valid, attaches the decoded user to req.user.
   ============================================================ */

const jwt = require("jsonwebtoken");
const JWT_SECRET = "expense_tracker_secret_key_2026";

function requireAuth(req, res, next) {
  // The frontend sends the token in the Authorization header like:
  // Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Please log in." });
  }

  const token = authHeader.split(" ")[1]; // extract just the token part

  try {
    // Verify the token signature and expiry
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach the user's id, username, email to the request
    // Controllers can now access req.user.id to scope data per user
    req.user = decoded;

    next(); // token is valid — proceed to the route handler
  } catch (err) {
    // Token is expired or tampered with
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

module.exports = requireAuth;
