const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
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
  const path = ENDPOINTS.TRADE_INFO;

  const queryObj = { exchange: exchangeLower };
  if (symbol) {
    queryObj.symbol = symbol.toUpperCase(); // normalize (BTC/INR, SHIB/INR, etc.)
  }

  const { fullUrl, fullPath } = buildUrlAndParams(path, queryObj);

  // For GET → pass query params for signature generation
  const headers = getAuthHeaders(method, fullPath, queryObj);

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