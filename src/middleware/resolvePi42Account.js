// middlewares/resolvePi42Account.js

const Pi42Account = require("../models/pi42Models/pi42Account");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const resolvePi42Account = catchAsync(async (req, res, next) => {
  // Support both query params and body
  const userKey = req.query.user || req.body.user;

  if (!userKey) {
    return next(new AppError("user is required", 400));
  }

  const account = await Pi42Account.findOne({ user: String(userKey), isDeleted: false }).lean();

  if (!account) {
    return next(new AppError("Account not found for this user", 404));
  }

  if(!account.pi42UserId || !account.pi42AccountId) {
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
    // raw: account,    
  };

  next();
});

module.exports = resolvePi42Account;