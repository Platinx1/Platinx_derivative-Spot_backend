const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParams } = require("../../../utils/urlAndParamsHelper");

const ENDPOINTS = {
 ACTIVE_COINS: "/trade/api/v2/coins",
};

// 📋 Get Supported / Active Coins
exports.getSupportedCoins = catchAsync(async (req, res, next) => {
  const { exchange = "coinswitchx" } = req.query;

  const { apiKey, apiSecret } = req.coinswitchAccount ;

  // Validate exchange (optional but good practice)
  const validExchanges = ["coinswitchx", "wazirx", "c2c1", "c2c2"];
  if (!validExchanges.includes(exchange.toLowerCase())) {
    return next(
      new AppError(
        `Invalid exchange. Allowed values: ${validExchanges.join(", ")} (case insensitive)`,
        400
      )
    );
  }

  const method = "GET";
  const path = ENDPOINTS.ACTIVE_COINS;

  const queryObj = { exchange };
  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // const headers = getAuthHeaders(method, path, queryObj);
  const headers = getAuthHeaders(method, path, queryObj, null, apiKey, apiSecret);

  console.log("headers===========================================:", headers);

  const response = await axios({ method, url: fullUrl, headers });

  // Optional: basic validation / extraction
  if (!response.data || typeof response.data !== "object") {
    return next(new AppError("Invalid response format from CoinSwitch API", 500));
  }

  const coins = response.data?.data; // usually an array or object with coin info

  res.status(200).json({
    success: true,
    message: "Supported coins retrieved successfully",
    exchange: exchange.toLowerCase(),
    data: coins,
    totalCoins: Array.isArray(coins) ? coins.length : Object.keys(coins).length,
  });
});