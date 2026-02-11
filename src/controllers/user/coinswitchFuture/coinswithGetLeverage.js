const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");

const ENDPOINTS = {
  FUTURES_LEVERAGE: "/trade/api/v2/futures/leverage",
};

function buildUrlAndParams(basePath, queryObj = {}) {
  const queryString = new URLSearchParams(queryObj).toString();
  const fullPath = queryString ? `${basePath}?${queryString}` : basePath;
  const fullUrl = `${process.env.BASE_URL}${fullPath}`;
  return { fullUrl, queryObj, fullPath };
}

// 📋 Get Futures Leverage (current leverage set for a symbol on futures exchange)
exports.getFuturesLeverage = catchAsync(async (req, res, next) => {
  const { 
    symbol= "btcusdt", 
    exchange = "EXCHANGE_2" 
  } = req.query;

  // Validate required symbol
  if (!symbol || typeof symbol !== "string" || symbol.trim() === "") {
    return next(new AppError("Symbol is required (e.g., BTCUSDT, ETHUSDT)", 400));
  }

  // Validate exchange (required)
  const validExchanges = ["EXCHANGE_2"];
  const exchangeUpper = exchange.toUpperCase();
  if (!validExchanges.includes(exchangeUpper)) {
    return next(
      new AppError(
        `Invalid exchange. Allowed value: ${validExchanges.join(", ")} (case insensitive)`,
        400
      )
    );
  }

  const method = "GET";
  const path = ENDPOINTS.FUTURES_LEVERAGE;

  const queryObj = {
    symbol: symbol.toUpperCase(),     // normalize to uppercase (BTCUSDT, ETHUSDT, ...)
    exchange: exchangeUpper,
  };

  const { fullUrl, fullPath } = buildUrlAndParams(path, queryObj);

  // For GET → pass query params for signature generation
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

  const leverageData = response.data?.data || response.data;

  res.status(200).json({
    success: true,
    message: "Futures leverage retrieved successfully",
    symbol: queryObj.symbol,
    exchange: exchangeUpper,
    data: leverageData,
  });
});