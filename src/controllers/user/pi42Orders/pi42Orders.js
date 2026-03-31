const axios = require("axios");

const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");

exports.placeOrder = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    placeType, // ORDER_FORM | POSITION
    quantity,
    side, // BUY | SELL
    symbol,
    type, // ("MARKET", "LIMIT" in case of ORDER_FORM)   (MARKET, STOP_MARKET,LIMIT in case of POSITION)
    price,
    reduceOnly = false,
    positionId,
    stopLossPrice,
    takeProfitPrice,
    marginAsset = "INR",
  } = req.body;

  // 🔥 Common validations
  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
  }

  if (!placeType || !quantity || !type) {
    return next(new AppError("placeType, quantity and type are required", 400));
  }

  if (Number(quantity) <= 0) {
    return next(new AppError("Quantity must be greater than 0", 400));
  }

  const endpoint = `/v1/order/place-order`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  let body = {
    placeType,
    quantity: Number(quantity),
    type,
    reduceOnly: Boolean(reduceOnly),
  };

  // =========================
  // 🔥 ORDER_FORM (New Order)
  // =========================
  if (placeType === "ORDER_FORM") {
    if (!side || !symbol) {
      return next(new AppError("side and symbol are required for ORDER_FORM", 400));
    }

    body.side = side;
    body.symbol = symbol;
    body.marginAsset = marginAsset;

    if (type === "LIMIT") {
      if (!price) {
        return next(new AppError("price is required for LIMIT order", 400));
      }
      body.price = Number(price);
    }

    if (stopLossPrice) body.stopLossPrice = Number(stopLossPrice);
    if (takeProfitPrice) body.takeProfitPrice = Number(takeProfitPrice);
  }

  // =========================
  // 🔥 POSITION (Modify/Close)
  // =========================
  if (placeType === "POSITION") {
    if (!positionId) {
      return next(new AppError("positionId is required for POSITION", 400));
    }

    body.positionId = positionId;

    if (type === "LIMIT") {
      if (!price) {
        return next(new AppError("price is required for LIMIT order", 400));
      }
      body.price = Number(price);
    }

    if (stopLossPrice) {
      body.stopLossPrice = Number(stopLossPrice);
      body.type = "STOP_MARKET"; // enforce rule
    }

    if (takeProfitPrice) {
      body.takeProfitPrice = Number(takeProfitPrice);
      body.type = "STOP_MARKET"; // enforce rule
    }
  }

  let response;

  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Place Order Error:", err?.response?.data || err.message);

    return next(
      new AppError(
        err?.response?.data?.details || "Order placement failed",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Failed to place order", 500));
  }

  res.status(200).json({
    status: true,
    message: "Order placed successfully",
    data: response,
  });
});

exports.placeOrderWithLeverage = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    placeType, // ORDER_FORM | POSITION
    quantity,
    reduceOnly = false,
    side, // BUY | SELL
    symbol,
    type, // ("MARKET", "LIMIT" in case of ORDER_FORM)   (MARKET, STOP_MARKET,LIMIT in case of POSITION)
    price,
    stopLossPrice,
    takeProfitPrice,
    marginAsset = "INR",
    leverage,
    positionId,
  } = req.body;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
  }

  if (!placeType || !quantity || !side || !type || !leverage) {
    return next(
      new AppError(
        "placeType, quantity, side, type and leverage are required",
        400
      )
    );
  }

  if (Number(leverage) < 1 || Number(leverage) > 125) {
    return next(
      new AppError("Leverage must be between 1 and 125", 400)
    );
  }

  if (placeType === "ORDER_FORM" && !symbol) {
    return next(new AppError("symbol is required for ORDER_FORM", 400));
  }

  if (placeType === "POSITION" && !positionId) {
    return next(new AppError("positionId is required for POSITION", 400));
  }

  if (type === "LIMIT" && !price) {
    return next(new AppError("price is required for LIMIT orders", 400));
  }

  const endpoint = `/v1/order/place-order-with-leverage`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔹 body build (dynamic)
  const body = {
    placeType,
    quantity: Number(quantity),
    reduceOnly,
    side,
    type,
    leverage: Number(leverage),
  };

  if (placeType === "ORDER_FORM") {
    body.symbol = symbol;
    body.marginAsset = marginAsset;
  }

  if (placeType === "POSITION") {
    body.positionId = positionId;
  }

  if (price) body.price = Number(price);
  if (stopLossPrice) body.stopLossPrice = Number(stopLossPrice);
  if (takeProfitPrice) body.takeProfitPrice = Number(takeProfitPrice);

  let response;

  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Place Order With Leverage Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message ||
          "Failed to place order with leverage",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Order placement failed", 500));
  }

  res.status(200).json({
    status: true,
    message: "Order placed with leverage successfully",
    data: response,
  });
});

exports.getOrderByClientOrderId = catchAsync(async (req, res, next) => {
  const { userId, accountId, clientOrderId } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (!clientOrderId) {
    return next(
      new AppError("clientOrderId is required", 400)
    );
  }

  const endpoint = `/v1/order`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔹 query params
  const params = {
    clientOrderId,
  };

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params,
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Get Order Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch order",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Order not found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Order fetched successfully",
    data: response,
  });
});

exports.getMultipleOrdersByClientOrderId = catchAsync(async (req, res, next) => {
  const { userId, accountId, clientOrderIds } = req.body;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (!clientOrderIds || !Array.isArray(clientOrderIds)) {
    return next(
      new AppError("clientOrderIds must be an array", 400)
    );
  }

  if (clientOrderIds.length === 0) {
    return next(
      new AppError("clientOrderIds cannot be empty", 400)
    );
  }

  if (clientOrderIds.length > 100) {
    return next(
      new AppError("Maximum 100 clientOrderIds allowed", 400)
    );
  }

  const endpoint = `/v1/order/get-multiple`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔹 body
  const body = {
    clientOrderIds,
  };

  let response;

  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Get Multiple Orders Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch orders",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No orders found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Orders fetched successfully",
    data: response,
  });
});

exports.getOpenOrders = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    startTimestamp,
    endTimestamp,
    sortOrder = "desc",
    pageSize = 50,
  } = req.query;

  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  const endpoint = `/v1/order/open-orders`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔹 query params build
  const params = {
    sortOrder: sortOrder || "desc",
    pageSize: Number(pageSize) || 50,
  };

  if (startTimestamp) params.startTimestamp = Number(startTimestamp);
  if (endTimestamp) params.endTimestamp = Number(endTimestamp);

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params,
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Open Orders Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Failed to fetch open orders",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No open orders found", 500));
  }

  res.status(200).json({
    status: true,
    message: "Open orders fetched successfully",
    data: response,
  });
});

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { userId, accountId, clientOrderId } = req.body;

  if (!userId || !accountId || !clientOrderId) {
    return next(
      new AppError("userId, accountId and clientOrderId are required", 400)
    );
  }

  const endpoint = `/v1/order/delete-order`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  let response;

  try {
    // 🔥 axios DELETE with body
    const apiRes = await axios.delete(url, {
      headers,
      data: {
        clientOrderId,
      },
    });

    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Cancel Order Error:", err?.response?.data || err.message);

    return next(
      new AppError(
        err?.response?.data?.details || "Order cancel failed",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Failed to cancel order", 500));
  }

  res.status(200).json({
    status: true,
    message: "Order cancelled successfully",
    data: response,
  });
});

exports.cancelAllOrders = catchAsync(async (req, res, next) => {
  const { userId, accountId, symbols, baseAsset, marginAsset } = req.body;

  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  const endpoint = `/v1/order/cancel-all-orders`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔥 optional body build
  const body = {};

  if (symbols && Array.isArray(symbols) && symbols.length > 0) {
    body.symbols = symbols;
  }

  if (baseAsset) {
    body.baseAsset = baseAsset;
  }

  if (marginAsset) {
    body.marginAsset = marginAsset;
  }

  let response;

  try {
    const apiRes = await axios.delete(url, {
      headers,
      data: body, // 👈 optional body
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Cancel All Orders Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Cancel all orders failed",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Failed to cancel orders", 500));
  }

  res.status(200).json({
    status: true,
    message: "All orders cancelled successfully",
    data: response,
  });
});