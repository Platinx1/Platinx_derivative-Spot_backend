// middlewares/resolveCoinswitchAccount.js

const SubAccount = require("../models/subAccountSchema");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const resolveCoinswitchAccount = catchAsync(async (req, res, next) => {
  // Support both query params and body
  const userId = req.query.userId || req.body.userId;

  if (!userId) {
    return next(new AppError("userId is required", 400));
  }

  // Include apiKey & apiSecret explicitly because select:false
  const subAccount = await SubAccount.findOne({
    userId: String(userId).trim(),
  })
    .select("+apiKey +apiSecret")
    .lean();

  if (!subAccount) {
    return next(
      new AppError("CoinSwitch account not found for this user", 404)
    );
  }

  if (
    !subAccount.exchangeSubAccountId ||
    !subAccount.apiKey ||
    !subAccount.apiSecret
  ) {
    return next(
      new AppError(
        "CoinSwitch account is not properly configured with exchange credentials.",
        500
      )
    );
  }

  // Attach resolved account to request
  req.coinswitchAccount = {
    id: subAccount._id,
    userId: subAccount.userId,
    name: subAccount.name,
    type: subAccount.type,
    exchange: subAccount.exchange,

    exchangeSubAccountId: String(subAccount.exchangeSubAccountId),

    apiKey: subAccount.apiKey,
    apiSecret: subAccount.apiSecret,

    status: subAccount.status,
    isActive: subAccount.isActive,
  };

  next();
});

module.exports = resolveCoinswitchAccount;