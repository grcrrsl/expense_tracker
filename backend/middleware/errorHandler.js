/* ============================================================
   middleware/errorHandler.js
   A global error handler for the Express app.
   This catches any errors passed to next(err) by route handlers.
   ============================================================ */

function errorHandler(err, req, res, next) {
  // Log the error to the server console for debugging
  console.error("Unhandled error:", err.message || err);

  // Send a generic error response to the client
  res.status(err.status || 500).json({
    error: err.message || "An unexpected server error occurred.",
  });
}

module.exports = errorHandler;
