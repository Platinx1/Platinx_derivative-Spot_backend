// middlewares/resolveCoinswitchAccountFromToken.js

const CoinSwitchSpotAccount = require("../models/coinswitchModels/coinSwitchSpotAccount");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const resolveCoinswitchAccount = catchAsync(async (req, res, next) => {
  // user id comes from the verified access token
  const user = req.userId;

  if (!user) {
    return next(new AppError("user is required", 401));
  }

  const account = await CoinSwitchSpotAccount.findOne({
    user: String(user),
    isActive: true,
  }).lean();

  if (!account) {
    return next(new AppError("Spot account not found for this user", 404));
  }

  // Attach account to request
  req.coinswitchAccount = {
    id: account._id,
    user: account.user,
    name: account.name,
    type: account.type,
    exchange: account.exchange,
    status: account.status,
    isActive: account.isActive,
    isApiTradingEnabled: account.isApiTradingEnabled,
  };

  next();
});

module.exports = resolveCoinswitchAccount;
