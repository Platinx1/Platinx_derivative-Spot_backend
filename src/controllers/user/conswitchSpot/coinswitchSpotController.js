const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");


const BASE_URL = "https://coinswitch.co";

const ENDPOINTS = {
  PING: "/trade/api/v2/ping",
  SINGLE_PAIR_TICKER: "/trade/api/v2/24hr/ticker",
  ALL_PAIRS_TICKER: "/trade/api/v2/24hr/all-pairs/ticker",
};

// Helper to build full URL + return query params object for auth
function buildUrlAndParams(basePath, queryObj = {}) {
  const queryString = new URLSearchParams(queryObj).toString();
  const fullPath = queryString ? `${basePath}?${queryString}` : basePath;
  const fullUrl = `${BASE_URL}${fullPath}`;
  return { fullUrl, queryObj, fullPath };
}

// 📍 Ping (no params → simple)
exports.ping = catchAsync(async (req, res, next) => {
  const method = "GET";
  const path = ENDPOINTS.PING;
  const { fullUrl } = buildUrlAndParams(path, {});

  const headers = getAuthHeaders(method, path, {}); // empty queryObj

  const response = await axios({ method, url: fullUrl, headers });

  res.status(200).json({
    success: true,
    message: "CoinSwitch API connection successful",
    data: response.data,
  });
});

// 📊 Single Pair Ticker
exports.getSinglePairTicker = catchAsync(async (req, res, next) => {
  const { symbol = "BTC/INR", exchange = "coinswitchx" } = req.query;

  const method = "GET";
  const path = ENDPOINTS.SINGLE_PAIR_TICKER;

  const queryObj = { symbol, exchange };
  const { fullUrl } = buildUrlAndParams(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  res.status(200).json({
    success: true,
    message: "Single pair ticker retrieved successfully",
    data: response.data,
  });
});

// 📊 Get All Pairs Ticker
exports.getAllPairsTicker = catchAsync(async (req, res, next) => {
  const { exchange = "coinswitchx" } = req.query;

  const method = "GET";
  const path = ENDPOINTS.ALL_PAIRS_TICKER;

  const queryObj = { exchange };
  const { fullUrl } = buildUrlAndParams(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  const totalPairs = response.data.data ? Object.keys(response.data.data).length : 0;

  res.status(200).json({
    success: true,
    message: "All pairs ticker retrieved successfully",
    data: response.data,
    totalPairs,
  });
});

// 📊 Get Specific Pairs (filter from all-pairs response)
exports.getSpecificPairs = catchAsync(async (req, res, next) => {
  const { symbols, exchange = "coinswitchx" } = req.query;

  if (!symbols) {
    return next(new AppError("symbols parameter is required (comma-separated). Example: BTC/INR,ETH/INR", 400));
  }

  const symbolArray = symbols.split(",").map((s) => s.trim());

  const method = "GET";
  const path = ENDPOINTS.ALL_PAIRS_TICKER;

  const queryObj = { exchange };
  const { fullUrl } = buildUrlAndParams(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  if (!response.data.data) {
    return next(new AppError("No data received from CoinSwitch API", 500));
  }

  const allPairs = response.data.data;
  const filteredPairs = {};

  symbolArray.forEach((symbol) => {
    if (allPairs[symbol]) filteredPairs[symbol] = allPairs[symbol];
  });

  res.status(200).json({
    success: true,
    message: "Specific pairs retrieved successfully",
    data: filteredPairs,
    totalRequested: symbolArray.length,
    totalFound: Object.keys(filteredPairs).length,
  });
});

