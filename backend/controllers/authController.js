/* ============================================================
   controllers/authController.js
   Handles user registration and login.
   - Passwords are hashed with bcryptjs (never stored plain text)
   - On login, returns a JWT token the frontend stores in memory
   ============================================================ */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

// Secret key for signing JWT tokens.
// In production, move this to an environment variable (.env file).
const JWT_SECRET = "expense_tracker_secret_key_2026";
const JWT_EXPIRES_IN = "7d"; // token lasts 7 days

/* ----------------------------------------------------------
   PREPARED STATEMENTS
   ---------------------------------------------------------- */
const stmtFindByEmail    = db.prepare("SELECT * FROM users WHERE email = ?");
const stmtFindByUsername = db.prepare("SELECT * FROM users WHERE username = ?");
const stmtInsertUser     = db.prepare(
  "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
);
const stmtInsertSettings = db.prepare(
  "INSERT OR IGNORE INTO settings (user_id, budget, theme) VALUES (?, 0, 'dark')"
);
const stmtGetById        = db.prepare("SELECT * FROM users WHERE id = ?");

/* ----------------------------------------------------------
   HELPER — generate a JWT for a given user
   ---------------------------------------------------------- */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/* ----------------------------------------------------------
   POST /api/auth/register
   Creates a new user account.
   Body: { username, email, password }
   ---------------------------------------------------------- */
async function register(req, res) {
  const { username, email, password } = req.body;

  // --- Validation ---
  if (!username || username.trim().length < 3)
    return res.status(400).json({ error: "Username must be at least 3 characters." });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Please enter a valid email address." });
  if (!password || password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });

  try {
    // Check if email is already taken
    const existingEmail = stmtFindByEmail.get(email.toLowerCase().trim());
    if (existingEmail)
      return res.status(409).json({ error: "An account with that email already exists." });

    // Check if username is already taken
    const existingUsername = stmtFindByUsername.get(username.trim());
    if (existingUsername)
      return res.status(409).json({ error: "That username is already taken." });

    // Hash the password — bcrypt automatically adds a salt
    // 10 = cost factor (higher = slower = safer; 10 is a good default)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user
    const result = stmtInsertUser.run(username.trim(), email.toLowerCase().trim(), hashedPassword);
    const newUserId = result.lastInsertRowid;

    // Create a default settings row for this user
    stmtInsertSettings.run(newUserId);

    // Fetch the new user and return a token
    const newUser = stmtGetById.get(newUserId);
    const token = generateToken(newUser);

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
}

/* ----------------------------------------------------------
   POST /api/auth/login
   Authenticates a user.
   Body: { email, password }
   ---------------------------------------------------------- */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    // Find user by email
    const user = stmtFindByEmail.get(email.toLowerCase().trim());
    if (!user)
      return res.status(401).json({ error: "Invalid email or password." });

    // Compare the provided password against the stored hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(401).json({ error: "Invalid email or password." });

    // Issue a JWT token
    const token = generateToken(user);

    res.json({
      message: "Login successful!",
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
}

module.exports = { register, login };
