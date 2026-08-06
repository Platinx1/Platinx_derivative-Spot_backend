const axios = require('axios');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');
const CoinswitchOrder = require('../../../models/coinswitchModels/coinswitchOrder');
const CoinswitchPortfolio = require('../../../models/coinswitchModels/coinswitchPortfolio');
const CoinswitchWallet = require('../../../models/coinswitchModels/coinswitchWallet');
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

  const { id: coinswitchAccountId } = req.coinswitchAccount;

  // Required validation
  if (!payload.side || !payload.symbol || !payload.type || !payload.price || !payload.quantity) {
    return next(new AppError('Missing required fields: side, symbol, type, price, quantity', 400));
  }

  if (payload.type.toLowerCase() !== 'limit') {
    return next(new AppError('Only "limit" order type is supported by CoinSwitch Spot API', 400));
  }

  // Normalize (doc says case insensitive, but better to standardize)
  payload.side = payload.side.toLowerCase();
  payload.type = "limit"; // payload.type.toLowerCase()
  payload.symbol = payload.symbol.toUpperCase(); // e.g. BTC/INR
  payload.exchange = "coinswitchx"; // payload.exchange.toLowerCase()

  // Allowed values check
  const validSides = ['buy', 'sell'];

  if (!validSides.includes(payload.side)) {
    return next(new AppError('Invalid side: must be "buy" or "sell"', 400));
  }

  // Price & quantity must be numbers
  payload.price = Number(payload.price);
  payload.quantity = Number(payload.quantity);

  if (isNaN(payload.price) || isNaN(payload.quantity)) {
    return next(new AppError('Price and quantity must be valid numbers', 400));
  }

  // ==================== VALIDATIONS ====================

  if (payload.side === 'buy') {
    // Buy side - Check Wallet balance (Amount based)
    const requiredAmount = payload.price * payload.quantity;
    const fee = requiredAmount * 0.004; // 0.4%
    const totalRequired = requiredAmount + fee;

    const wallet = await CoinswitchWallet.findOne({
      coinswitchAccount: coinswitchAccountId
    });

    if (!wallet || Number(wallet.freeBalance || 0) < totalRequired) {
      return next(new AppError(
        `Insufficient balance. Required: ₹${totalRequired.toFixed(2)} (incl. 0.4% fee)`,
        400
      ));
    }
  }
  else if (payload.side === 'sell') {
    // Sell side - Check Portfolio quantity
    const portfolio = await CoinswitchPortfolio.findOne({
      coinswitchAccount: coinswitchAccountId,
      symbol: payload.symbol
    });

    if (!portfolio || Number(portfolio.totalQuantity || 0) < payload.quantity) {
      return next(new AppError(
        `Insufficient ${payload.symbol} balance. You have ${Number(portfolio?.totalQuantity || 0)} available`,
        400
      ));
    }
  }

  // ==================== PLACE ORDER ====================
  const method = 'POST';
  const path = ENDPOINTS.ORDER;
  const queryObj = {}; // No query params for this endpoint
  const { fullUrl } = buildUrlAndParams(path, queryObj); // This will use BASE_URL=https://coinswitch.co

  // Generate signature (your function handles body canonicalization for POST)
  const headers = getAuthHeaders(method, path, queryObj, payload);

  // console.log('Placing spot order with payload:', payload);
  // console.log('Request URL:', fullUrl);
  // console.log('Headers (without secret):', {
  //   ...headers,
  //   'X-AUTH-SIGNATURE': headers['X-AUTH-SIGNATURE'].slice(0, 10) + '...', // mask for logs
  // });

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      data: payload,
    });

    const order = new CoinswitchOrder({
      orderId: response.data.data.order_id,
      coinswitchAccount: coinswitchAccountId,
    });

    await order.save({
      validateBeforeSave: false,
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

    console.error('Error placing spot order:', error.message, error.stack);

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
  const payload = { order_id: orderId }; // body

  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // Generate auth headers
  // Note: For this endpoint → body is NOT included in signature (same as place order)
  const headers = getAuthHeaders(method, path, queryObj, payload);

  console.log('Cancelling spot order:', { order_id: orderId });
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



// exports.getSpotOrder = catchAsync(async (req, res, next) => {
//   const { order_id } = req.query; // ← most common: query string

//   // You can also support body if you prefer (some clients send via POST body)
//   // const { order_id } = req.body || req.query;

//   // Validation
//   if (!order_id || typeof order_id !== 'string' || order_id.trim() === '') {
//     return next(new AppError('order_id is required and must be a non-empty string', 400));
//   }

//   const method = 'GET';
//   const path = ENDPOINTS.ORDER;
//   const queryObj = { order_id };      // goes into ?order_id=xxx
//   const payload = null;               // no body for GET

//   const { fullUrl } = buildUrlAndParams(path, queryObj);

//   // Generate signature
//   // For GET → no body is appended (your existing getAuthHeaders already handles this correctly)
//   const headers = getAuthHeaders(method, path, queryObj, payload);

//   console.log('Fetching spot order:', { order_id });
//   console.log('Full URL:', fullUrl);
//   console.log('Headers (masked):', {
//     ...headers,
//     'X-AUTH-SIGNATURE': headers['X-AUTH-SIGNATURE']?.slice(0, 10) + '...' || 'missing',
//   });

//   try {
//     const response = await axios({
//       method,
//       url: fullUrl,
//       headers,
//       // no data/body for GET
//     });

//     handleApiResponse(res, 'Spot order details retrieved successfully', response.data);
//   } catch (error) {
//     if (error.response) {
//       const { status, data } = error.response;

//       if (status === 404) {
//         return next(new AppError('Order not found', 404));
//       }
//       if (status === 400) {
//         return next(new AppError(data.message || 'Bad request (invalid order_id?)', 400));
//       }
//       if (status === 401) {
//         return next(new AppError('Invalid API credentials or unauthorized', 401));
//       }
//       if (status === 422) {
//         return next(new AppError(data.message || 'Validation error', 422));
//       }
//       if (status === 500) {
//         return next(new AppError('CoinSwitch internal server error – try again later', 500));
//       }

//       return next(new AppError(`CoinSwitch error: ${data.message || 'Unknown error'}`, status));
//     }

//     // Network / timeout / DNS / etc.
//     return next(new AppError('Failed to connect to CoinSwitch API', 503));
//   }
// });



exports.getAllSpotOrders = catchAsync(async (req, res, next) => {
  const { id: coinswitchAccountId } = req.coinswitchAccount;
  const { limit = 50, page = 1, status } = req.query;

  const query = {
    coinswitchAccount: coinswitchAccountId,
    price: { $gt: 0 },
    isDeleted: false
  };

  if (status) {
    query.status = status.toUpperCase();
  } else {
    query.status = { $in: ["OPEN", "RAISED", "PARTIALLY_EXECUTED"] };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const orders = await CoinswitchOrder.find(query)
    .sort({ createdTime: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await CoinswitchOrder.countDocuments(query);

  res.status(200).json({
    status: true,
    results: orders.length,
    total,
    currentPage: Number(page),
    totalPages: Math.ceil(total / limit),
    data: orders
  });
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
    status,
    open,
  } = req.query;

  // For closed orders: open should be false or omitted
  if (open !== undefined && open !== false && open !== 'false') {
    return next(new AppError('For closed orders, open must be false or omitted', 400));
  }

  const queryObj = { open: false };

  // Optional: warn if likely empty result
  if (!from_time && !to_time && !status) {
    console.warn(
      '[CLOSED ORDERS] No time range or status → API may return empty (common when no recent activity)'
    );
  }

  if (count !== undefined) {
    const parsed = Number(count);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) {
      return next(new AppError('count must be integer 1–500', 400));
    }
    queryObj.count = parsed;
  }

  if (from_time !== undefined) {
    const parsed = Number(from_time);
    if (isNaN(parsed)) return next(new AppError('from_time must be valid ms timestamp', 400));
    queryObj.from_time = parsed;
  }

  if (to_time !== undefined) {
    const parsed = Number(to_time);
    if (isNaN(parsed)) return next(new AppError('to_time must be valid ms timestamp', 400));
    queryObj.to_time = parsed;
  }

  if (side) {
    const norm = side.toLowerCase().trim();
    if (!['buy', 'sell'].includes(norm)) return next(new AppError('side must be buy or sell', 400));
    queryObj.side = norm;
  }

  if (symbols) queryObj.symbols = symbols.trim();
  if (exchanges) queryObj.exchanges = exchanges.toLowerCase().trim();

  if (type) {
    const norm = type.toLowerCase().trim();
    if (norm !== 'limit') return next(new AppError('type must be limit', 400));
    queryObj.type = norm;
  }

  if (status) {
    queryObj.status = status.trim();
  }

  // Do NOT force open here → API defaults to false for closed/historical
  // If user explicitly sends open=false, it will be added as boolean false

  const method = 'GET';
  const path = ENDPOINTS.ORDERS_LIST;
  const payload = null;

  const { fullUrl } = buildUrlAndParams(path, queryObj);
  const headers = getAuthHeaders(method, path, queryObj, payload);

  console.log("========================", queryObj);

  // console.log('[CLOSED ORDERS] Query:', queryObj);
  // console.log('[CLOSED ORDERS] URL:', fullUrl);

  try {
    const response = await axios({ method, url: fullUrl, headers });

    // Extra debug – helps understand if empty is expected
    if (response.data?.orders?.length === 0) {
      console.log('[CLOSED ORDERS] Returned 0 orders – check if account has closed activity');
    }

    handleApiResponse(res, 'Closed orders retrieved successfully', response.data);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      let msg = data?.message || 'CoinSwitch error';
      if (status === 400) msg += ' – check parameters';
      return next(new AppError(msg, status));
    }
    return next(new AppError('Failed to connect to CoinSwitch API', 503));
  }
});