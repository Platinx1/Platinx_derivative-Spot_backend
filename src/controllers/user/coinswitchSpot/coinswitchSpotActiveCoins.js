const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const CoinSwitchPairs = require("../../../models/coinswitchModels/coinSwitchPairs");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParams } = require("../../../utils/urlAndParamsHelper");

const ENDPOINTS = {
 ACTIVE_COINS: "/trade/api/v2/coins",
};

// 📋 Get Supported / Active Coins
exports.getSupportedCoins = catchAsync(async (req, res, next) => {
  const { exchange = "coinswitchx" } = req.query;

  // const { apiKey, apiSecret } = req.coinswitchAccount ;

  // Validate exchange (optional but good practice)
  const validExchanges = ["coinswitchx"];
  if (!validExchanges.includes(exchange.toLowerCase())) {
    return next(new AppError(`Invalid exchange value`, 400));
  }

  const method = "GET";
  const path = ENDPOINTS.ACTIVE_COINS;

  const queryObj = { exchange };
  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // const headers = getAuthHeaders(method, path, queryObj);
  // const headers = getAuthHeaders(method, path, queryObj, null, apiKey, apiSecret);
  const headers = getAuthHeaders(method, path, queryObj, null);

  const response = await axios({ method, url: fullUrl, headers });

  // Optional: basic validation / extraction
  if (!response.data || typeof response.data !== "object") {
    return next(new AppError("Invalid response format from CoinSwitch API", 500));
  }

  const coins = response.data?.data; // usually an array or object with coin info

  const totalCoins = Array.isArray(coins)
  ? coins.length
  : Array.isArray(coins?.[exchange.toLowerCase()])
    ? coins[exchange.toLowerCase()].length
    : 0;

  res.status(200).json({
    success: true,
    message: "Supported coins retrieved successfully",
    exchange: exchange.toLowerCase(),
    data: coins,
    totalCoins,
    // totalCoins: Array.isArray(coins) ? coins.exchange.length : Object.keys(coins).length,
  });
});


// exports.getSupportedCoins = catchAsync(async (req, res, next) => {
//   const { exchange = "coinswitchx" } = req.query;

//   // Validate exchange (optional but good practice)
//   const validExchanges = ["coinswitchx"];
//   if (!validExchanges.includes(exchange.toLowerCase())) {
//     return next(new AppError(`Invalid exchange value`, 400));
//   }

//   const method = "GET";
//   const path = ENDPOINTS.ACTIVE_COINS;

//   const queryObj = { exchange };
//   const { fullUrl } = buildUrlAndParams(path, queryObj);

//   const headers = getAuthHeaders(method, path, queryObj, null);

//   const response = await axios({ method, url: fullUrl, headers });

//   if (!response.data || typeof response.data !== "object") {
//     return next(new AppError("Invalid response format from CoinSwitch API", 500));
//   }

//   // const coins = response.data?.data; // usually an array or object with coin info
//   const coins = response.data?.data?.[exchange.toLowerCase()] || [];

//   // Prepare documents
//   const pairDocs = coins.map((pair) => ({
//     name: pair,
//   }));

//   // Insert into MongoDB
//   await CoinSwitchPairs.insertMany(pairDocs, {
//     ordered: false, // duplicate aaye to baaki insert hote rahenge
//   });

//   const totalCoins = Array.isArray(coins)
//   ? coins.length
//   : Array.isArray(coins?.[exchange.toLowerCase()])
//     ? coins[exchange.toLowerCase()].length
//     : 0;

//   res.status(200).json({
//     success: true,
//     message: "Supported coins retrieved successfully",
//     exchange: exchange.toLowerCase(),
//     data: coins,
//     totalCoins,
//     // totalCoins: Array.isArray(coins) ? coins.exchange.length : Object.keys(coins).length,
//   });
// });



exports.getCoinSwitchPairs = catchAsync(async (req, res, next) => {
  const { name } = req.query;

  const filter = {};

  if (name) {
    filter.name = name.toUpperCase();
  }

  const pairs = await CoinSwitchPairs.find(filter).sort({ name: 1 });

  res.status(200).json({
    success: true,
    message: "CoinSwitch pairs fetched successfully",
    totalPairs: pairs.length,
    data: pairs,
  });
});