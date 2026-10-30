// middlewares/verifyAccessToken.js

const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

const verifyAccessToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authorization token missing", 401));
  }

  const token = authHeader.split(" ")[1];

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

  console.log("user_id:", userId);

  req.userId = String(userId);

  next();
};

module.exports = verifyAccessToken;
