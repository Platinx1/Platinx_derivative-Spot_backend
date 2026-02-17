const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParamsDMA } = require("../../../utils/urlAndParamsHelper");


// Helper to handle responses
const handleApiResponse = (res, message, data) => {
  res.status(200).json({
    success: true,
    message,
    data,
  });
};

// 📍 Get Server Time (Ping-like for sync)
exports.getServerTime = catchAsync(async (req, res, next) => {
  const method = "GET";
  const path = "/v5/market/time";
  const queryObj = {}; // No params
  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  handleApiResponse(res, "Server time retrieved successfully", response.data);
});

// 📊 Get Instruments Info
exports.getInstrumentsInfo = catchAsync(async (req, res, next) => {
  const { category = "linear", symbol, limit = 1 } = req.query;

  const method = "GET";
  const path = "/v5/market/instruments-info";
  const queryObj = { category };
  if (symbol) queryObj.symbol = symbol;
  if (limit) queryObj.limit = limit;

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  handleApiResponse(
    res,
    "Instruments info retrieved successfully",
    response.data,
  );
});

// 📊 Get Tickers
exports.getTickers = catchAsync(async (req, res, next) => {
  const { category = "linear", symbol } = req.query;

  if (!symbol) return next(new AppError("Symbol is required", 400));

  const method = "GET";
  const path = "/v5/market/tickers";
  const queryObj = { category, symbol };

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);
  console.log("Requesting tickers with URL:", fullUrl);
  console.log("Request headers:", headers);

  const response = await axios({ method, url: fullUrl, headers });

  handleApiResponse(res, "Tickers retrieved successfully", response.data);
});

// 📊 Get Orderbook
exports.getOrderbook = catchAsync(async (req, res, next) => {
  const { category = "linear", symbol, limit = 10 } = req.query;

  if (!symbol) return next(new AppError("Symbol is required", 400));

  const method = "GET";
  const path = "/v5/market/orderbook";
  const queryObj = { category, symbol, limit };

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  handleApiResponse(res, "Orderbook retrieved successfully", response.data);
});

// 📝 Place Order (Market/Limit, Long/Short)
exports.placeOrder = catchAsync(async (req, res, next) => {
  const body = req.body; // { symbol, side: 'Buy'/'Sell', orderType: 'Market'/'Limit', qty, price?, positionIdx: 0/1/2, category: 'linear', timeInForce: 'GTC'/'IOC'/'FOK', orderLinkId? }
  if (!body.symbol || !body.side || !body.orderType || !body.qty) {
    return next(
      new AppError(
        "Missing required fields: symbol, side, orderType, qty",
        400,
      ),
    );
  }
  body.category = body.category || "linear";

  const method = "POST";
  const path = "/v5/order/create";
  const queryObj = {};
  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj, body);

  const response = await axios({ method, url: fullUrl, headers, data: body });

  handleApiResponse(res, "Order placed successfully", response.data);
});

// 🚫 Cancel Order
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const body = req.body; // { symbol, orderId?, orderLinkId?, category: 'linear' }
  if (!body.symbol || (!body.orderId && !body.orderLinkId)) {
    return next(
      new AppError(
        "Missing required fields: symbol and (orderId or orderLinkId)",
        400,
      ),
    );
  }
  body.category = body.category || "linear";

  const method = "POST";
  const path = "/v5/order/cancel";
  const queryObj = {};
  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj, body);

  const response = await axios({ method, url: fullUrl, headers, data: body });

  handleApiResponse(res, "Order cancelled successfully", response.data);
});

// 📋 Get Open Orders (Active: New/PartiallyFilled)
exports.getOpenOrders = catchAsync(async (req, res, next) => {
  const {
    symbol,
    category = "linear",
    orderStatus = "New,PartiallyFilled",
  } = req.query; // Filter for open

  const method = "GET";
  const path = "/v5/order/realtime"; // Or /v5/order/list if available; doc shows realtime
  const queryObj = { category };
  if (symbol) queryObj.symbol = symbol;
  if (orderStatus) queryObj.orderStatus = orderStatus;

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  // Filter client-side if needed
  const openOrders = response.data.result.list.filter((order) =>
    ["New", "PartiallyFilled"].includes(order.orderStatus),
  );

  handleApiResponse(res, "Open orders retrieved successfully", {
    ...response.data,
    result: { ...response.data.result, list: openOrders },
  });
});

// 📜 Get Order History (All orders, including filled/cancelled)
exports.getOrderHistory = catchAsync(async (req, res, next) => {
  const { symbol, category = "linear", limit = 50 } = req.query;

  const method = "GET";
  const path = "/v5/order/history"; // Assuming Bybit-like; if not in doc, use /v5/order/realtime with broader filters
  const queryObj = { category, limit };
  if (symbol) queryObj.symbol = symbol;

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  handleApiResponse(res, "Order history retrieved successfully", response.data);
});

// 📋 Get Order Details (Specific order)
exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const { symbol, orderId, orderLinkId, category = "linear" } = req.query;

  if (!symbol || (!orderId && !orderLinkId))
    return next(
      new AppError("Symbol and (orderId or orderLinkId) required", 400),
    );

  const method = "GET";
  const path = "/v5/order/realtime";
  const queryObj = { symbol, category };
  if (orderId) queryObj.orderId = orderId;
  if (orderLinkId) queryObj.orderLinkId = orderLinkId;

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  handleApiResponse(res, "Order details retrieved successfully", response.data);
});

// 📜 Get Trade History (Executions)
exports.getTradeHistory = catchAsync(async (req, res, next) => {
  const {
    symbol,
    orderId,
    orderLinkId,
    category = "linear",
    limit = 50,
  } = req.query;

  const method = "GET";
  const path = "/v5/execution/list";
  const queryObj = { category, limit };
  if (symbol) queryObj.symbol = symbol;
  if (orderId) queryObj.orderId = orderId;
  if (orderLinkId) queryObj.orderLinkId = orderLinkId;

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  handleApiResponse(res, "Trade history retrieved successfully", response.data);
});

// 🔄 Switch Position Mode (One-way/Hedge)
exports.switchPositionMode = catchAsync(async (req, res, next) => {
  const body = req.body; // { mode: 0 (One-way) or 3 (Hedge), coin: 'USDT', category: 'linear', symbol? }

  if (body.mode === undefined)
    return next(new AppError("Mode is required (0: One-way, 3: Hedge)", 400));

  const method = "POST";
  const path = "/v5/position/switch-mode";
  const queryObj = {};
  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj, body);

  const response = await axios({ method, url: fullUrl, headers, data: body });

  handleApiResponse(res, "Position mode switched successfully", response.data);
});

// 📊 Get Open Positions
exports.getOpenPositions = catchAsync(async (req, res, next) => {
  const { symbol, category = "linear" } = req.query;

  const method = "GET";
  const path = "/v5/position/list";
  const queryObj = { category };
  if (symbol) queryObj.symbol = symbol;

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  const response = await axios({ method, url: fullUrl, headers });

  handleApiResponse(
    res,
    "Open positions retrieved successfully",
    response.data,
  );
});

// ⚙️ Set Leverage
exports.setLeverage = catchAsync(async (req, res, next) => {
  const body = req.body; // { symbol, buyLeverage, sellLeverage, category: 'linear' }

  if (!body.symbol || !body.buyLeverage || !body.sellLeverage) {
    return next(
      new AppError(
        "Missing required fields: symbol, buyLeverage, sellLeverage",
        400,
      ),
    );
  }

  const method = "POST";
  const path = "/v5/position/set-leverage";
  const queryObj = {};
  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj, body);

  const response = await axios({ method, url: fullUrl, headers, data: body });

  handleApiResponse(res, "Leverage set successfully", response.data);
});

// 🛑 Set TP/SL (From old doc)
exports.setTpSl = catchAsync(async (req, res, next) => {
  const body = req.body; // { symbol, positionIdx: 0/1/2, tpslMode: 'Full'/'Partial', takeProfit?, stopLoss?, tpTriggerBy: 'LastPrice', slTriggerBy: 'LastPrice', tpOrderType: 'Market', slOrderType: 'Market', category: 'linear' }

  if (!body.symbol) return next(new AppError("Symbol is required", 400));
  body.category = body.category || "linear";

  const method = "POST";
  const path = "/v5/position/trading-stop";
  const queryObj = {};
  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj, body);

  const response = await axios({ method, url: fullUrl, headers, data: body });

  handleApiResponse(res, "TP/SL set successfully", response.data);
});

// 💸 Transfer Funds (IN/OUT, with quote_asset optional, default 'INR')
// exports.transferFunds = catchAsync(async (req, res, next) => {
//   const body = req.body; // { direction: 'IN'/'OUT', amount, client_txn_id, quote_asset?: 'INR'/'USDT' }

//   if (!body.direction || !body.amount ) {
//     return next(
//       new AppError(
//         "Missing required fields: direction, amount, client_txn_id",
//         400,
//       ),
//     );
//   }
//   body.quote_asset = body.quote_asset || "INR"; // Default to INR as per INR margined

//   const method = "POST";
//   const path = "/dma/api/v1/funds/transfer";
//   const queryObj = {};
//   const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

//   const headers = getAuthHeaders(method, path, queryObj, body);

//   const response = await axios({ method, url: fullUrl, headers, data: body });

//   handleApiResponse(res, "Funds transferred successfully", response.data);
// });

const { v4: uuidv4 } = require('uuid'); // Make sure uuid is installed: npm install uuid

exports.transferFunds = catchAsync(async (req, res, next) => {
  let body = { ...req.body }; // Create a copy so we don't mutate original req.body

  // Required fields check (client_txn_id is now optional from user)
  if (!body.direction || !body.amount) {
    return next(
      new AppError(
        "Missing required fields: direction and amount are mandatory",
        400,
      ),
    );
  }

  // Default quote_asset
  body.quote_asset = body.quote_asset || "INR";

  // Generate client_txn_id if not provided (recommended & safest)
  if (!body.client_txn_id) {
    body.client_txn_id = uuidv4();
    console.log("Auto-generated client_txn_id:", body.client_txn_id);
  } else {
    // Optional: Validate if user provided one
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.client_txn_id)) {
      return next(new AppError("Invalid client_txn_id format – must be valid UUID v4", 400));
    }
  }

  // Extra validation for direction
  const directionUpper = body.direction.toUpperCase();
  if (!['IN', 'OUT'].includes(directionUpper)) {
    return next(new AppError("Invalid direction: must be 'IN' or 'OUT'", 400));
  }
  body.direction = directionUpper;

  // Amount must be positive number
  const amountNum = Number(body.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return next(new AppError("Amount must be a positive number", 400));
  }
  body.amount = amountNum;

  const method = "POST";
  const path = "/dma/api/v1/funds/transfer";
  const queryObj = {};
  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  // Now headers will include the body with client_txn_id
  const headers = getAuthHeaders(method, path, queryObj, body);

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      data: body,
    });

    handleApiResponse(res, "Funds transferred successfully", {
      ...response.data,
      client_txn_id: body.client_txn_id, // Return the used txn id for tracking
    });
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      const apiMsg = data?.message || "Unknown error";

      if (status === 422 && data?.code === 601) {
        return next(new AppError(`Invalid client_txn_id: ${apiMsg}`, 422));
      }
      if (status === 401) {
        return next(new AppError(`Unauthorized: Invalid signature or API key – ${apiMsg}`, 401));
      }
      if (status === 500) {
        return next(new AppError("CoinSwitch internal error – please retry", 500));
      }

      return next(new AppError(`CoinSwitch rejected: ${apiMsg} (code ${status})`, status));
    }

    return next(new AppError("Network error connecting to CoinSwitch", 503));
  }
});

// 🔒 Close Position (Place market order to close)
exports.closePosition = catchAsync(async (req, res, next) => {
  const { symbol, side, qty, category = "linear" } = req.body; // side: 'Sell' to close long, 'Buy' to close short; qty: full or partial

  if (!symbol || !side || !qty)
    return next(
      new AppError("Missing required fields: symbol, side, qty", 400),
    );

  const body = {
    symbol,
    side,
    orderType: "Market",
    qty,
    reduceOnly: true, // Important to close position
    category,
    timeInForce: "IOC",
  };

  const method = "POST";
  const path = "/v5/order/create";
  const queryObj = {};
  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj, body);

  const response = await axios({ method, url: fullUrl, headers, data: body });

  handleApiResponse(
    res,
    "Position close order placed successfully",
    response.data,
  );
});
