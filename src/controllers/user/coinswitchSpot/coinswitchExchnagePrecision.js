const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParams } = require("../../../utils/urlAndParamsHelper");

const ENDPOINTS = {
  EXCHANGE_PRECISION: "/trade/api/v2/exchangePrecision",
};

// 📋 Get Exchange Precision (precision, min/max qty, etc. per symbol)
exports.getExchangePrecision = catchAsync(async (req, res, next) => {
  const { exchange = "coinswitchx", symbol } = req.body;

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

  // symbol is optional — but if provided, it's usually in format "BTC/INR"
  let bodyPayload = { exchange: exchangeLower };
  if (symbol) {
    bodyPayload.symbol = symbol.toUpperCase(); // normalize to uppercase (common convention)
  }

  const method = "POST";
  const path = ENDPOINTS.EXCHANGE_PRECISION;

  // For signing: query is empty, payload goes in body
  const { fullUrl, fullPath } = buildUrlAndParams(path, {}, bodyPayload);

  const headers = getAuthHeaders(method, fullPath, {}); // no query params

  console.log("headers===========================================:", headers);

  const response = await axios({
    method,
    url: fullUrl,
    headers,
    data: bodyPayload,           // ← important: send JSON body
  });

  // Optional: basic response validation
  if (!response.data || typeof response.data !== "object") {
    return next(new AppError("Invalid response format from CoinSwitch API", 500));
  }

  const precisionData = response.data?.data || response.data;

  res.status(200).json({
    success: true,
    message: "Exchange precision retrieved successfully",
    exchange: exchangeLower,
    symbol: symbol || "all symbols",
    data: precisionData,
  });
});