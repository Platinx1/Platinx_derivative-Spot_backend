// middlewares/verifyAccessToken.js

const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

// Cookie value is "Bearer%20<jwt>"; cookie-parser URL-decodes it to "Bearer <jwt>".
// Falls back to the Authorization header for Postman / non-browser clients.
const extractToken = (req) => {
  const raw = req.cookies?.access_token || req.headers.authorization;
  if (!raw) return null;

  const value = decodeURIComponent(String(raw)).trim();
  return value.startsWith("Bearer ") ? value.slice(7).trim() : value;
};

const verifyAccessToken = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError("Authorization token missing", 401));
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError("Invalid or expired token", 401));
  }

  const userId = payload.sub || payload.id || payload._id || payload.userId;

  if (!userId) {
    return next(new AppError("User id not found in token", 401));
  }

  req.userId = String(userId);

  next();
};

module.exports = verifyAccessToken;
