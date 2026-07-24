const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const CoinSwitchPairs = require("../../../models/coinswitchModels/coinSwitchPairs");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParams } = require("../../../utils/urlAndParamsHelper");

const ENDPOINTS = {
  TRADE_INFO: "/trade/api/v2/tradeInfo",
  TRADING_FEE: "/trade/api/v2/tradingFee",
};


// 📋 Get Trade Info (trading details, fees, status, etc. for exchange / symbol)
exports.getTradeInfo = catchAsync(async (req, res, next) => {
  const { exchange = "coinswitchx", symbol = "BTC/INR" } = req.query;

  // Validate exchange (required)
  const validExchanges = ["coinswitchx"];

  const exchangeLower = exchange.toLowerCase();

  if (!validExchanges.includes(exchangeLower)) {
    return next(new AppError(`Invalid exchange value`, 400));
  }

  const method = "GET";
  const path = ENDPOINTS.TRADE_INFO;

  const queryObj = { exchange: exchangeLower };
  if (symbol) {
    queryObj.symbol = symbol.toUpperCase(); // normalize (BTC/INR, SHIB/INR, etc.)
  }

  const { fullUrl, fullPath } = buildUrlAndParams(path, queryObj);

  // For GET → pass query params for signature generation
  const headers = getAuthHeaders(method, fullPath, queryObj, null);

  console.log("headers===========================================:", headers);

  const response = await axios({
    method,
    url: fullUrl,
    headers,
  });

  // Basic response validation
  if (!response.data || typeof response.data !== "object") {
    return next(new AppError("Invalid response format from CoinSwitch API", 500));
  }

  const tradeInfo = response.data?.data || response.data;

  res.status(200).json({
    success: true,
    message: "Trade information retrieved successfully",
    exchange: exchangeLower,
    symbol: symbol || "all symbols",
    data: tradeInfo,
  });
});


exports.getTradingFee = catchAsync(async (req, res, next) => {
  console.log("ddfd")
  const { exchange = "coinswitchx" } = req.query;

  // Validate exchange (required)
  const validExchanges = ["coinswitchx", "wazirx", "c2c1", "c2c2"];
  const exchangeLower = exchange.toLowerCase();
  if (!validExchanges.includes(exchangeLower)) {
    return next(
      new AppError(
        `Invalid exchange. Allowed values: ${validExchanges.join(", ")} (case insensitive)`,
        400
      )
    );
  }

  const method = "GET";
  const path = ENDPOINTS.TRADING_FEE;

  const queryObj = { exchange: exchangeLower };

  const { fullUrl, fullPath } = buildUrlAndParams(path, queryObj);

  // For GET → include query params in signature
  const headers = getAuthHeaders(method, fullPath, queryObj);

  const response = await axios({
    method,
    url: fullUrl,
    headers,
  });

  // Basic response validation
  if (!response.data || typeof response.data !== "object") {
    return next(new AppError("Invalid response format from CoinSwitch API", 500));
  }

  const feeData = response.data?.data || response.data;

  res.status(200).json({
    success: true,
    message: "Trading fees retrieved successfully",
    exchange: exchangeLower,
    data: feeData,
  });
});



// getSupportedCoins, syncTradeInfo
// exports.syncTradeInfo = catchAsync(async (req, res, next) => {
//   const exchange = "coinswitchx";
//   const exchangeLower = exchange.toLowerCase();

//   // Fetch all pairs from DB
//   const pairs = await CoinSwitchPairs.find({}, { name: 1 });

//   if (!pairs.length) {
//     return next(new AppError("No trading pairs found in database.", 404));
//   }

//   let updatedCount = 0;
//   let failedCount = 0;
//   const failedPairs = [];

//   // Loop through all pairs one by one
//   for (const pair of pairs) {
//     try {
//       const method = "GET";
//       const path = ENDPOINTS.TRADE_INFO;

//       const queryObj = {
//         exchange: exchangeLower,
//         symbol: pair.name,
//       };

//       const { fullUrl, fullPath } = buildUrlAndParams(path, queryObj);

//       const headers = getAuthHeaders(method, fullPath, queryObj, null);

//       const response = await axios({
//         method,
//         url: fullUrl,
//         headers,
//       });

//       const tradeInfo =
//         response?.data?.data?.[exchangeLower]?.[pair.name];

//       if (!tradeInfo) {
//         failedCount++;
//         failedPairs.push({
//           pair: pair.name,
//           reason: "Trade info not found",
//         });
//         continue;
//       }

//       await CoinSwitchPairs.updateOne(
//         { _id: pair._id },
//         {
//           $set: {
//             minQty: Number(tradeInfo.quote?.min) || 0,
//             maxQty: Number(tradeInfo.quote?.max) || 0,
//             quantityPrecision: tradeInfo.precision?.base ?? 0,
//             pricePrecision: tradeInfo.precision?.limit ?? 0,
//           },
//         }
//       );

//       updatedCount++;
//     } catch (error) {
//       failedCount++;

//       failedPairs.push({
//         pair: pair.name,
//         reason:
//           error.response?.data?.message ||
//           error.message ||
//           "Unknown Error",
//       });

//       console.error(`Failed for ${pair.name}:`, error.message);
//     }
//   }

//   return res.status(200).json({
//     success: true,
//     message: "Trade info synced successfully.",
//     totalPairs: pairs.length,
//     updatedCount,
//     failedCount,
//     failedPairs,
//   });
// });