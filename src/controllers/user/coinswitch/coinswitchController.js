const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");

// 🔐 API CREDENTIALS
const API_KEY = process.env.COINSWITCH_API_KEY || "96afec1a6311df1688784bb5c1734d6b86baaf86a9fbdfd764b55d8846db53f1";
const API_SECRET = process.env.COINSWITCH_API_SECRET || "fb7537705c2fcf2bed30307f759ea6592c9b937646bc60ebf4dc2202a04bb2cc";
const BASE_URL = "https://coinswitch.co"; // ⚠️ Spaces hata diye

const ENDPOINTS = {
  PING: "/trade/api/v2/ping",
  SINGLE_PAIR_TICKER: "/trade/api/v2/24hr/ticker",
  ALL_PAIRS_TICKER: "/trade/api/v2/24hr/all-pairs/ticker",
};

// 📍 Ping (working)
exports.ping = catchAsync(async (req, res, next) => {
  const method = "GET";
  const path = ENDPOINTS.PING;
  const url = BASE_URL + path;

  const response = await axios({
    method: method,
    url: url,
    headers: getAuthHeaders(method, path, '', API_KEY, API_SECRET),
  });

  res.status(200).json({
    success: true,
    message: "CoinSwitch API connection successful",
    data: response.data,
  });
});

// 📊 Single Pair Ticker (Fixed)
exports.getSinglePairTicker = catchAsync(async (req, res, next) => {
  const { symbol = "BTC/INR", exchange = "coinswitchx" } = req.query;

  const method = "GET";
  const path = ENDPOINTS.SINGLE_PAIR_TICKER;
  
  // ⚠️ Important: Query params ko path mein include karo signature ke liye
  const queryParams = `symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`;
  const pathWithQuery = `${path}?${queryParams}`;
  const url = BASE_URL + pathWithQuery;

  try {
    const response = await axios({
      method: method,
      url: url,
      headers: getAuthHeaders(method, pathWithQuery, '', API_KEY, API_SECRET),
    });

    res.status(200).json({
      success: true,
      message: "Single pair ticker retrieved successfully",
      data: response.data,
    });
  } catch (err) {
    // 🛡️ Circular reference fix: Sirf specific fields extract karo
    const errorPayload = {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      url: err.config?.url // Sirf URL log karo, poora config nahi
    };
    
    console.error("CoinSwitch API Error:", errorPayload);
    return next(new AppError(`API Error: ${JSON.stringify(errorPayload)}`, err.response?.status || 500));
  }
});

// 📊 Get All Pairs Ticker
exports.getAllPairsTicker = catchAsync(async (req, res, next) => {
  const { exchange = "coinswitchx" } = req.query;

  const method = "GET";
  const path = ENDPOINTS.ALL_PAIRS_TICKER;
  const params = `?exchange=${exchange}`;
  const url = BASE_URL + path + params;

  const response = await axios({
    method: method,
    url: url,
    headers: getAuthHeaders(method, path), // ✅ Path without params
  });

  const totalPairs = response.data.data ? Object.keys(response.data.data).length : 0;

  res.status(200).json({
    success: true,
    message: "All pairs ticker retrieved successfully",
    data: response.data,
    totalPairs: totalPairs,
    status: response.status,
  });
});

// 📊 Get Specific Pairs
exports.getSpecificPairs = catchAsync(async (req, res, next) => {
  const { symbols, exchange = "coinswitchx" } = req.query;

  if (!symbols) {
    return next(
      new AppError("symbols parameter is required (comma-separated). Example: BTC/INR,ETH/INR", 400)
    );
  }

  const symbolArray = symbols.split(",").map((s) => s.trim());

  const method = "GET";
  const path = ENDPOINTS.ALL_PAIRS_TICKER;
  const params = `?exchange=${exchange}`;
  const url = BASE_URL + path + params;

  const response = await axios({
    method: method,
    url: url,
    headers: getAuthHeaders(method, path),
  });

  if (!response.data.data) {
    return next(new AppError("No data received from CoinSwitch API", 500));
  }

  const allPairs = response.data.data;
  const filteredPairs = {};

  symbolArray.forEach((symbol) => {
    if (allPairs[symbol]) {
      filteredPairs[symbol] = allPairs[symbol];
    }
  });

  res.status(200).json({
    success: true,
    message: "Specific pairs retrieved successfully",
    data: filteredPairs,
    totalRequested: symbolArray.length,
    totalFound: Object.keys(filteredPairs).length,
  });
});

// 📊 Get Top Pairs by Volume
exports.getTopPairsByVolume = catchAsync(async (req, res, next) => {
  const { limit = 10, exchange = "coinswitchx" } = req.query;

  const parsedLimit = parseInt(limit);
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    return next(new AppError("limit must be a positive number", 400));
  }

  const method = "GET";
  const path = ENDPOINTS.ALL_PAIRS_TICKER;
  const params = `?exchange=${exchange}`;
  const url = BASE_URL + path + params;

  const response = await axios({
    method: method,
    url: url,
    headers: getAuthHeaders(method, path),
  });

  if (!response.data.data) {
    return next(new AppError("No data received from CoinSwitch API", 500));
  }

  const allPairs = response.data.data;

  // Sort by quote volume
  const sortedPairs = Object.entries(allPairs)
    .sort(([, a], [, b]) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, parsedLimit);

  const topPairs = {};
  sortedPairs.forEach(([symbol, data]) => {
    topPairs[symbol] = data;
  });

  res.status(200).json({
    success: true,
    message: "Top pairs by volume retrieved successfully",
    data: topPairs,
    totalPairs: Object.keys(topPairs).length,
  });
});

// 📊 Get Price Statistics
exports.getPriceStats = catchAsync(async (req, res, next) => {
  const { symbol = "BTC/INR", exchange = "coinswitchx" } = req.query;

  const method = "GET";
  const path = ENDPOINTS.SINGLE_PAIR_TICKER;
  const params = `?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`;
  const url = BASE_URL + path + params;

  const response = await axios({
    method: method,
    url: url,
    headers: getAuthHeaders(method, path),
  });

  const data = response.data.data?.[symbol];

  if (!data) {
    return next(new AppError(`No data found for symbol: ${symbol}`, 404));
  }

  const priceChange = parseFloat(data.lastPrice) - parseFloat(data.openPrice);

  res.status(200).json({
    success: true,
    message: "Price statistics retrieved successfully",
    data: {
      symbol: data.symbol,
      currentPrice: parseFloat(data.lastPrice),
      openPrice: parseFloat(data.openPrice),
      highPrice: parseFloat(data.highPrice),
      lowPrice: parseFloat(data.lowPrice),
      priceChange: priceChange,
      priceChangePercent: data.percentageChange,
      volume: parseFloat(data.baseVolume),
      quoteVolume: parseFloat(data.quoteVolume),
      bidPrice: parseFloat(data.bidPrice),
      askPrice: parseFloat(data.askPrice),
      timestamp: data.at,
    },
  });
});

// 📊 Compare Multiple Pairs
exports.comparePairs = catchAsync(async (req, res, next) => {
  const { symbols, exchange = "coinswitchx" } = req.query;

  if (!symbols) {
    return next(
      new AppError("symbols parameter is required (comma-separated)", 400)
    );
  }

  const symbolArray = symbols.split(",").map((s) => s.trim());

  const method = "GET";
  const path = ENDPOINTS.ALL_PAIRS_TICKER;
  const params = `?exchange=${exchange}`;
  const url = BASE_URL + path + params;

  const response = await axios({
    method: method,
    url: url,
    headers: getAuthHeaders(method, path),
  });

  if (!response.data.data) {
    return next(new AppError("No data received from CoinSwitch API", 500));
  }

  const allPairs = response.data.data;
  const comparison = [];

  symbolArray.forEach((symbol) => {
    if (allPairs[symbol]) {
      comparison.push({
        symbol: symbol,
        price: parseFloat(allPairs[symbol].lastPrice),
        change: allPairs[symbol].percentageChange,
        volume: parseFloat(allPairs[symbol].quoteVolume),
        high: parseFloat(allPairs[symbol].highPrice),
        low: parseFloat(allPairs[symbol].lowPrice),
      });
    }
  });

  res.status(200).json({
    success: true,
    message: "Pairs comparison retrieved successfully",
    data: comparison,
    totalCompared: comparison.length,
  });
});

// 📊 Get Market Summary
exports.getMarketSummary = catchAsync(async (req, res, next) => {
  const { exchange = "coinswitchx" } = req.query;

  const method = "GET";
  const path = ENDPOINTS.ALL_PAIRS_TICKER;
  const params = `?exchange=${exchange}`;
  const url = BASE_URL + path + params;

  const response = await axios({
    method: method,
    url: url,
    headers: getAuthHeaders(method, path),
  });

  if (!response.data.data) {
    return next(new AppError("No data received from CoinSwitch API", 500));
  }

  const allPairs = response.data.data;
  const pairsArray = Object.values(allPairs);

  // Calculate market summary
  const totalPairs = pairsArray.length;
  const gainers = pairsArray.filter((p) => parseFloat(p.percentageChange) > 0).length;
  const losers = pairsArray.filter((p) => parseFloat(p.percentageChange) < 0).length;
  const unchanged = totalPairs - gainers - losers;

  const totalVolume = pairsArray.reduce(
    (sum, p) => sum + parseFloat(p.quoteVolume || 0),
    0
  );

  // Top gainers and losers
  const topGainers = pairsArray
    .filter((p) => parseFloat(p.percentageChange) > 0)
    .sort((a, b) => parseFloat(b.percentageChange) - parseFloat(a.percentageChange))
    .slice(0, 5)
    .map((p) => ({
      symbol: p.symbol,
      price: parseFloat(p.lastPrice),
      change: p.percentageChange,
    }));

  const topLosers = pairsArray
    .filter((p) => parseFloat(p.percentageChange) < 0)
    .sort((a, b) => parseFloat(a.percentageChange) - parseFloat(b.percentageChange))
    .slice(0, 5)
    .map((p) => ({
      symbol: p.symbol,
      price: parseFloat(p.lastPrice),
      change: p.percentageChange,
    }));

  res.status(200).json({
    success: true,
    message: "Market summary retrieved successfully",
    data: {
      totalPairs,
      gainers,
      losers,
      unchanged,
      totalVolume: totalVolume.toFixed(2),
      topGainers,
      topLosers,
      exchange,
    },
  });
});