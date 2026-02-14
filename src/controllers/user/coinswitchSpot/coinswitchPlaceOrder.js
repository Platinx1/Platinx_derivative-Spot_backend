// controllers/user/coinswitchSpot/coinswitchSpotOrderController.js

const axios = require('axios');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');
const { getAuthHeaders } = require('../../../utils/signatureHelper');
const { buildUrlAndParams } = require('../../../utils/urlAndParamsHelper'); // Use spot base (BASE_URL)

const SPOT_BASE_URL = process.env.BASE_URL || 'https://coinswitch.co'; // from .env

// Helper response
const handleApiResponse = (res, message, data) => {
  res.status(200).json({
    success: true,
    message,
    data,
  });
};


exports.createSpotOrder = catchAsync(async (req, res, next) => {
  const payload = req.body;

  // Required validation
  if (!payload.side || !payload.symbol || !payload.type || !payload.price || !payload.quantity || !payload.exchange) {
    return next(new AppError('Missing required fields: side, symbol, type, price, quantity, exchange', 400));
  }

  if (payload.type.toLowerCase() !== 'limit') {
    return next(new AppError('Only "limit" order type is supported by CoinSwitch Spot API', 400));
  }

  // Normalize (doc says case insensitive, but better to standardize)
  payload.side = payload.side.toLowerCase();
  payload.type = payload.type.toLowerCase();
  payload.symbol = payload.symbol.toUpperCase(); // e.g. BTC/INR
  payload.exchange = payload.exchange.toLowerCase();

  // Allowed values check
  const validSides = ['buy', 'sell'];
  const validExchanges = ['coinswitchx', 'wazirx', 'c2c1', 'c2c2'];

  if (!validSides.includes(payload.side)) {
    return next(new AppError('Invalid side: must be "buy" or "sell"', 400));
  }
  if (!validExchanges.includes(payload.exchange)) {
    return next(new AppError('Invalid exchange: must be one of coinswitchx, wazirx, c2c1, c2c2', 400));
  }

  // Price & quantity must be numbers
  payload.price = Number(payload.price);
  payload.quantity = Number(payload.quantity);

  if (isNaN(payload.price) || isNaN(payload.quantity)) {
    return next(new AppError('Price and quantity must be valid numbers', 400));
  }

  const method = 'POST';
  const path = '/trade/api/v2/order';
  const queryObj = {}; // No query params for this endpoint
  const { fullUrl } = buildUrlAndParams(path, queryObj); // This will use BASE_URL=https://coinswitch.co

  // Generate signature (your function handles body canonicalization for POST)
  const headers = getAuthHeaders(method, path, queryObj, payload);

  console.log('Placing spot order with payload:', payload);
  console.log('Request URL:', fullUrl);
  console.log('Headers (without secret):', {
    ...headers,
    'X-AUTH-SIGNATURE': headers['X-AUTH-SIGNATURE'].slice(0, 10) + '...', // mask for logs
  });

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      data: payload,
    });

    handleApiResponse(res, 'Spot order placed successfully', response.data);
  } catch (error) {
    // Handle CoinSwitch-specific errors
    if (error.response) {
      const { status, data } = error.response;

      if (status === 422) {
        return next(new AppError(data.message || 'Validation error (e.g., invalid price type)', 422));
      }
      if (status === 400) {
        return next(new AppError(data.message || 'Bad request (e.g., insufficient balance)', 400));
      }
      if (status === 401) {
        return next(new AppError('Invalid API credentials or access denied', 401));
      }
      if (status === 500) {
        return next(new AppError('CoinSwitch internal server error – please retry later', 500));
      }

      return next(new AppError(`CoinSwitch error: ${data.message || 'Unknown error'}`, status));
    }

    // Network/timeout error
    return next(new AppError('Failed to connect to CoinSwitch API', 503));
  }
});