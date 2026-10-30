// middlewares/resolvePi42AccountFromToken.js

const Pi42Account = require("../models/pi42Models/pi42Account");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const verifyAccessToken = require("./verifyAccessToken");

const resolvePi42Account = catchAsync(async (req, res, next) => {
  // user id comes from the verified access token
  const userKey = req.userId;

  if (!userKey) {
    return next(new AppError("user is required", 401));
  }

  const account = await Pi42Account.findOne({ user: String(userKey), isDeleted: false }).lean();

  if (!account) {
    return next(new AppError("Futures account not found for this user", 404));
  }

  if (!account.pi42UserId || !account.pi42AccountId) {
    return next(new AppError("Your account is not registered with pi42.", 500));
  }

  // ✅ Attach to req so downstream controllers can use it
  req.pi42Account = {
    id: account._id,
    user: account.user,
    userId: String(account.pi42UserId),
    accountId: String(account.pi42AccountId),
    refId: account.refId,
    autoTopUpEnabled: account.autoTopUpEnabled,
  };

  next();
});

// Verify the token first, then resolve the Pi42 account for that user
module.exports = [verifyAccessToken, resolvePi42Account];
