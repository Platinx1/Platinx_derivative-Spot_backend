const axios = require('axios');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');
const CoinswitchTrade = require("../../../models/coinswitchModels/coinswitchTrade");
const { getAuthHeaders } = require('../../../utils/signatureHelper');
const { buildUrlAndParams } = require('../../../utils/urlAndParamsHelper');

const ENDPOINTS = {
  TRADES: '/trade/api/v2/trades'
};

// Helper response
const handleApiResponse = (res, message, data) => {
  res.status(200).json({
    success: true,
    message,
    data,
  });
};


exports.getUserTrades = catchAsync(async (req, res, next) => {
  const { id: coinswitchAccountId } = req.coinswitchAccount;

  const {
    user,
    side,
    orderId,
    symbol,
    limit = 50,
    page = 1
  } = req.query;

  const query = {
    coinswitchAccount: coinswitchAccountId,
    isDeleted: false
  };

  // Filters
  if (side) {
    query.side = side.toUpperCase();
  }

  if (orderId) {
    query.orderId = orderId;
  }

  if (symbol) {
    const cleanSymbol = symbol.toUpperCase().trim().replace(/\/.*/, ""); // sirf base currency nikal lo (BTC/INR -> BTC)
    query.symbol = { $regex: `^${cleanSymbol}/`, $options: "i" };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const trades = await CoinswitchTrade.find(query)
    .sort({ tradeTime: -1, createdAt: -1 })   // Latest trades first
    .skip(skip)
    .limit(Number(limit));

  const total = await CoinswitchTrade.countDocuments(query);

  res.status(200).json({
    status: true,
    results: trades.length,
    currentPage: Number(page),
    totalPages: Math.ceil(total / limit),
    data: trades
  });
});


// not being used
exports.getSpotTrades = catchAsync(async (req, res, next) => {
  const { exchange, symbol } = req.body;

  // Required parameters
  if (!exchange || typeof exchange !== 'string') {
    return next(new AppError('exchange is required (coinswitchx, wazirx, c2c1, c2c2)', 400));
  }

  if (!symbol || typeof symbol !== 'string') {
    return next(new AppError('symbol is required (e.g. BTC/INR, ETH/USDT)', 400));
  }

  // Normalize inputs (API is case insensitive, but better to standardize)
  const normalizedExchange = exchange.toLowerCase().trim();
  const normalizedSymbol = symbol.toUpperCase().trim();

  // Validate allowed exchanges
  const validExchanges = ['coinswitchx', 'wazirx', 'c2c1', 'c2c2'];
  if (!validExchanges.includes(normalizedExchange)) {
    return next(new AppError(`Invalid exchange. Allowed: ${validExchanges.join(', ')}`, 400));
  }

  // Basic symbol format check (you can make it stricter if needed)
  if (!normalizedSymbol.includes('/')) {
    return next(new AppError('Invalid symbol format. Expected: BASE/QUOTE (e.g. BTC/INR)', 400));
  }

  const queryObj = {
    exchange: normalizedExchange,
    symbol: normalizedSymbol,
  };

  const method = 'GET';
  const path = ENDPOINTS.TRADES;
  const payload = null; // GET → no body

  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // Generate signature (no body → your helper already handles this correctly)
  const headers = getAuthHeaders(method, path, queryObj, payload);

  console.log('Fetching trade history:', queryObj);
  console.log('Full URL:', fullUrl);
  console.log('Headers (masked):', {
    ...headers,
    'X-AUTH-SIGNATURE': headers['X-AUTH-SIGNATURE']?.slice(0, 10) + '...' || 'missing',
  });

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      // no data/body for GET
    });

    handleApiResponse(res, 'Trade history retrieved successfully', response.data);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 400) {
        return next(new AppError(data.message || 'Bad request – check exchange and symbol', 400));
      }
      if (status === 401) {
        return next(new AppError('Invalid API credentials or unauthorized', 401));
      }
      if (status === 404) {
        return next(new AppError('No trades found or invalid parameters', 404));
      }
      if (status === 422) {
        return next(new AppError(data.message || 'Validation error', 422));
      }
      if (status === 500) {
        return next(new AppError('CoinSwitch internal server error – try again later', 500));
      }

      return next(new AppError(`CoinSwitch error: ${data.message || 'Unknown error'}`, status));
    }

    // Network / timeout / etc.
    return next(new AppError('Failed to connect to CoinSwitch API', 503));
  }
});