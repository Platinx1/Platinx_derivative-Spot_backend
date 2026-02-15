const axios = require('axios');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');
const { getAuthHeaders } = require('../../../utils/signatureHelper');
const { buildUrlAndParams } = require('../../../utils/urlAndParamsHelper'); 


const ENDPOINTS = {
  ORDER: '/trade/api/v2/order',
  ORDERS_LIST: '/trade/api/v2/orders'
};

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
  const path = ENDPOINTS.ORDER;
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


exports.cancelSpotOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  // Basic validation
  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
    return next(new AppError('orderId is required and must be a non-empty string', 400));
  }

  const method = 'DELETE';
  const path = ENDPOINTS.ORDER;
  const queryObj = {}; // No query parameters
  const payload = { order_id : orderId }; // body

  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // Generate auth headers
  // Note: For this endpoint → body is NOT included in signature (same as place order)
  const headers = getAuthHeaders(method, path, queryObj, payload);

  console.log('Cancelling spot order:', { order_id : orderId });
  console.log('Request URL:', fullUrl);
  console.log('Headers (masked):', {
    ...headers,
    'X-AUTH-SIGNATURE': headers['X-AUTH-SIGNATURE']?.slice(0, 10) + '...' || 'missing',
  });

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      data: payload,
    });

    handleApiResponse(res, 'Spot order cancelled successfully', response.data);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 404) {
        return next(new AppError('Order not found or already cancelled', 404));
      }
      if (status === 400) {
        return next(new AppError(data.message || 'Bad request (invalid order_id format?)', 400));
      }
      if (status === 401) {
        return next(new AppError('Invalid API credentials or unauthorized', 401));
      }
      if (status === 422) {
        return next(new AppError(data.message || 'Validation failed', 422));
      }
      if (status === 500) {
        return next(new AppError('CoinSwitch internal server error – try again later', 500));
      }

      return next(new AppError(`CoinSwitch error: ${data.message || 'Unknown error'}`, status));
    }

    // Network / timeout / etc.
    return next(new AppError('Failed to reach CoinSwitch API', 503));
  }
});


exports.getSpotOrder = catchAsync(async (req, res, next) => {
  const { order_id } = req.query; // ← most common: query string

  // You can also support body if you prefer (some clients send via POST body)
  // const { order_id } = req.body || req.query;

  // Validation
  if (!order_id || typeof order_id !== 'string' || order_id.trim() === '') {
    return next(new AppError('order_id is required and must be a non-empty string', 400));
  }

  const method = 'GET';
  const path = ENDPOINTS.ORDER;
  const queryObj = { order_id };      // goes into ?order_id=xxx
  const payload = null;               // no body for GET

  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // Generate signature
  // For GET → no body is appended (your existing getAuthHeaders already handles this correctly)
  const headers = getAuthHeaders(method, path, queryObj, payload);

  console.log('Fetching spot order:', { order_id });
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

    handleApiResponse(res, 'Spot order details retrieved successfully', response.data);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 404) {
        return next(new AppError('Order not found', 404));
      }
      if (status === 400) {
        return next(new AppError(data.message || 'Bad request (invalid order_id?)', 400));
      }
      if (status === 401) {
        return next(new AppError('Invalid API credentials or unauthorized', 401));
      }
      if (status === 422) {
        return next(new AppError(data.message || 'Validation error', 422));
      }
      if (status === 500) {
        return next(new AppError('CoinSwitch internal server error – try again later', 500));
      }

      return next(new AppError(`CoinSwitch error: ${data.message || 'Unknown error'}`, status));
    }

    // Network / timeout / DNS / etc.
    return next(new AppError('Failed to connect to CoinSwitch API', 503));
  }
});


exports.getSpotOpenOrders = catchAsync(async (req, res, next) => {
  const {
    count,
    from_time,
    to_time,
    side,
    symbols,
    exchanges,
    type,
    open = 'true', // most common use-case → defaults to true (open orders)
  } = req.query;

  // Basic validation – at minimum open should be true for "open orders"
  if (open !== 'true' && open !== true) {
    return next(new AppError('For fetching open orders, open must be true', 400));
  }

  // Optional params – convert to correct types / formats
  const queryObj = {};

  if (count !== undefined) {
    const parsedCount = Number(count);
    if (!Number.isInteger(parsedCount) || parsedCount < 1) {
      return next(new AppError('count must be a positive integer', 400));
    }
    queryObj.count = parsedCount;
  }

  if (from_time !== undefined) {
    const parsedFrom = Number(from_time);
    if (isNaN(parsedFrom)) {
      return next(new AppError('from_time must be a valid timestamp (milliseconds)', 400));
    }
    queryObj.from_time = parsedFrom;
  }

  if (to_time !== undefined) {
    const parsedTo = Number(to_time);
    if (isNaN(parsedTo)) {
      return next(new AppError('to_time must be a valid timestamp (milliseconds)', 400));
    }
    queryObj.to_time = parsedTo;
  }

  if (side) {
    const normalizedSide = side.toLowerCase();
    if (!['buy', 'sell'].includes(normalizedSide)) {
      return next(new AppError('side must be "buy" or "sell" (case insensitive)', 400));
    }
    queryObj.side = normalizedSide;
  }

  if (symbols) {
    // Can be comma-separated → we pass as-is (API accepts "btc/inr,eth/inr")
    queryObj.symbols = symbols;
  }

  if (exchanges) {
    // Can be comma-separated → pass as-is
    queryObj.exchanges = exchanges.toLowerCase();
  }

  if (type) {
    const normalizedType = type.toLowerCase();
    if (normalizedType !== 'limit') { // API currently supports only limit (per your earlier info)
      return next(new AppError('type must be "limit" (only supported type)', 400));
    }
    queryObj.type = normalizedType;
  }

  // Force open=true (string or boolean – but query string will stringify it)
  queryObj.open = true;

  const method = 'GET';
  const path = ENDPOINTS.ORDERS_LIST;
  const payload = null; // GET → no body

  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // Signature – no body for GET (your helper already handles this correctly)
  const headers = getAuthHeaders(method, path, queryObj, payload);

  console.log('Fetching open orders with query:', queryObj);
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
      // no data for GET
    });

    handleApiResponse(res, 'Open orders retrieved successfully', response.data);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 400) {
        return next(new AppError(data.message || 'Bad request (invalid parameters)', 400));
      }
      if (status === 401) {
        return next(new AppError('Invalid API credentials or unauthorized', 401));
      }
      if (status === 422) {
        return next(new AppError(data.message || 'Validation error in query params', 422));
      }
      if (status === 500) {
        return next(new AppError('CoinSwitch internal server error – try again later', 500));
      }

      return next(new AppError(`CoinSwitch error: ${data.message || 'Unknown error'}`, status));
    }

    return next(new AppError('Failed to connect to CoinSwitch API', 503));
  }
});


exports.getSpotClosedOrders = catchAsync(async (req, res, next) => {
  const {
    count,
    from_time,
    to_time,
    side,
    symbols,
    exchanges,
    type,
    status,           // e.g. EXECUTED, CANCELLED, EXPIRED, ...
    open = 'false',   // must be false for closed orders
  } = req.query;

  // Enforce open=false for closed/historical orders
  if (open !== 'false' && open !== false) {
    return next(new AppError('For closed/historical orders, open must be false', 400));
  }

  const queryObj = { open: false }; // force open=false

  // Optional: count (default in API is 500 according to your latest info)
  if (count !== undefined) {
    const parsedCount = Number(count);
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 500) {
      return next(new AppError('count must be an integer between 1 and 500', 400));
    }
    queryObj.count = parsedCount;
  }

  // Time range filters
  if (from_time !== undefined) {
    const parsedFrom = Number(from_time);
    if (isNaN(parsedFrom)) {
      return next(new AppError('from_time must be a valid millisecond timestamp', 400));
    }
    queryObj.from_time = parsedFrom;
  }

  if (to_time !== undefined) {
    const parsedTo = Number(to_time);
    if (isNaN(parsedTo)) {
      return next(new AppError('to_time must be a valid millisecond timestamp', 400));
    }
    queryObj.to_time = parsedTo;
  }

  // Side filter
  if (side) {
    const normalizedSide = side.toLowerCase();
    if (!['buy', 'sell'].includes(normalizedSide)) {
      return next(new AppError('side must be "buy" or "sell" (case insensitive)', 400));
    }
    queryObj.side = normalizedSide;
  }

  // Symbols (comma-separated ok)
  if (symbols) {
    queryObj.symbols = symbols;
  }

  // Exchanges (comma-separated ok)
  if (exchanges) {
    queryObj.exchanges = exchanges.toLowerCase();
  }

  // Type (currently only limit supported)
  if (type) {
    const normalizedType = type.toLowerCase();
    if (normalizedType !== 'limit') {
      return next(new AppError('Only "limit" type is currently supported', 400));
    }
    queryObj.type = normalizedType;
  }

  // Status filter – common values: EXECUTED, CANCELLED, EXPIRED, DISCARDED, ...
  if (status) {
    // You can pass single value or comma-separated if API supports it
    // API might also support: in:EXECUTED,CANCELLED (check official docs)
    queryObj.status = status;
  }

  const method = 'GET';
  const path = ENDPOINTS.ORDERS_LIST;
  const payload = null; // no body

  const { fullUrl } = buildUrlAndParams(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj, payload);

  console.log('Fetching closed orders with query:', queryObj);
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
    });

    handleApiResponse(res, 'Closed orders retrieved successfully', response.data);
  } catch (error) {
    if (error.response) {
      const { status: httpStatus, data } = error.response;

      if (httpStatus === 400) {
        return next(new AppError(data.message || 'Bad request – check parameters', 400));
      }
      if (httpStatus === 401) {
        return next(new AppError('Unauthorized – invalid API credentials', 401));
      }
      if (httpStatus === 422) {
        return next(new AppError(data.message || 'Validation error in query parameters', 422));
      }
      if (httpStatus === 500) {
        return next(new AppError('CoinSwitch internal server error – try again later', 500));
      }

      return next(new AppError(`CoinSwitch API error: ${data.message || 'Unknown'}`, httpStatus));
    }

    return next(new AppError('Failed to reach CoinSwitch API', 503));
  }
});