const axios = require("axios");
const mongoose = require("mongoose");
const CoinswitchWallet = require('../../../models/coinswitchModels/coinswitchWallet');
const CoinswitchPortfolio = require('../../../models/coinswitchModels/coinswitchPortfolio');
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");
const { getPi42User, getPi42UserByPlatinxUserId } = require("../../../services/pi42UserService");




exports.getCombinedWalletAndPortfolio = catchAsync(async (req, res, next) => {
  const { marginAsset = "INR" } = req.query;

  // ─── 1. Validate accounts from middlewares ───
  const { id: coinswitchAccountId } = req.coinswitchAccount || {};
  const { userId, accountId } = req.pi42Account || {};

  if (!coinswitchAccountId) {
    return next(new AppError("Spot account not found for this user", 404));
  }
  if (!userId || !accountId) {
    return next(new AppError("Futures account not found for this user", 404));
  }

  if (!["INR", "USDT"].includes(marginAsset)) {
    return next(new AppError("marginAsset must be INR or USDT", 400));
  }

  // ─── 2. Spot Wallet ───
  let spotWallet = null;
  const walletDoc = await CoinswitchWallet.findOne({
    coinswitchAccount: coinswitchAccountId,
  });

  if (walletDoc) {
    const data = walletDoc.toObject();
    spotWallet = {
      totalBalance: Number(data.totalBalance).toFixed(2),
      freeBalance: Number(data.freeBalance).toFixed(2),
      lockedBalance: Number(data.lockedBalance).toFixed(2),
      availableForSpot: Number(data.availableForSpot).toFixed(2),
      // add any other fields you need
    };
  }

  // ─── 3. Futures Wallet (Pi42 API) ───
  let futuresWallet = null;

  const userData = await getPi42User(userId, accountId);
  if (!userData) {
    return next(new AppError("Pi42 user not found", 404));
  }

  const endpoint = `/v1/wallet/futures-wallet/details`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  try {
    const apiRes = await axios.get(url, {
      headers,
      params: { marginAsset },
    });
    futuresWallet = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Wallet Error:", err?.response?.data || err.message);
  }

  // ─── 4. Spot Portfolio – Total Invested ───
  const portfolioQuery = {
    coinswitchAccount: coinswitchAccountId,
    isDeleted: false,
    totalQuantity: {
      $gt: mongoose.Types.Decimal128.fromString("0"),
    },
  };

  const portfolioItems = await CoinswitchPortfolio.find(portfolioQuery).select(
    "totalInvested"
  );

  const totalInvested = portfolioItems.reduce((sum, item) => {
    return sum + Number(item.totalInvested || 0);
  }, 0);

  // ─── 5. Futures Portfolio (OPEN positions – sum of margin) ───
  let futuresPortfolio = {
    totalInvested: "0.00",
    totalAssets: 0,
  };

  try {
    const positionsEndpoint = `/v1/positions/OPEN`;
    const positionsUrl = `${process.env.PI42_PILOT_BASE_URL}${positionsEndpoint}`;

    const positionsRes = await axios.get(positionsUrl, {
      headers,
      params: {
        sortOrder: "desc",
        pageSize: 100,
      },
    });

    const openPositions = Array.isArray(positionsRes.data)
      ? positionsRes.data
      : [];

    const totalMargin = openPositions.reduce((sum, pos) => {
      return sum + Number(pos.margin || 0);
    }, 0);

    futuresPortfolio = {
      totalInvested: totalMargin.toFixed(2),
      totalAssets: openPositions.length,
    };
  } catch (err) {
    console.error(
      "❌ PI42 Open Positions Error:",
      err?.response?.data || err.message
    );
    // Keep default 0 values – don’t break the whole response
  }

  // ─── 6. Final Response ───
  res.status(200).json({
    status: true,
    message: "Combined wallet & portfolio data fetched successfully",
    data: {
      spotWallet,
      futuresWallet,
      spotPortfolio: {
        totalInvested: totalInvested.toFixed(2),
        totalAssets: portfolioItems.length,
      },
      futuresPortfolio,
    },
  });
});