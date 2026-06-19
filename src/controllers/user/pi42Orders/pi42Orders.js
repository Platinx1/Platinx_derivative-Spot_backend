const axios = require("axios");

const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");
const validatePrecision = require("../../../utils/validatePrecision");
const Pi42Pairs = require("../../../models/pi42Models/pi42Pairs");

const { createPi42Order, cancelPi42Order, cancelAllPi42Orders } = require("../../../services/pi42OrderService");
const { getPi42User } = require("../../../services/pi42UserService");

exports.placeOrder = catchAsync(async (req, res, next) => {
  const {
    placeType, // ORDER_FORM | POSITION
    quantity,
    side, // BUY | SELL
    symbol,
    type, // ("MARKET", "LIMIT" in case of ORDER_FORM)  (MARKET, STOP_MARKET,LIMIT in case of POSITION)
    price,
    reduceOnly = false,
    positionId,
    stopLossPrice,
    takeProfitPrice,
    marginAsset = "INR",
  } = req.body;

  const { userId, accountId } = req.pi42Account;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
  }

  if (!placeType || !quantity || !type) {
    return next(new AppError("placeType, quantity and type are required", 400));
  }

  if (Number(quantity) <= 0) {
    return next(new AppError("Quantity must be greater than 0", 400));
  }

  const pairData = await Pi42Pairs.findOne({ name: symbol });

  if (!pairData) {
    return next(
      new AppError(`Pair configuration not found for symbol: ${symbol}`, 404)
    );
  }

  const quantityPrecision = Number(pairData.quantityPrecision);
  const pricePrecision = Number(pairData.pricePrecision);

  // quantity
  if (!validatePrecision(quantity, quantityPrecision)) {
    return next(
      new AppError(
        `Quantity can have maximum ${quantityPrecision} decimal place(s) for ${symbol}`,
        400
      )
    );
  }

  // price
  if (price !== undefined) {
    if (!validatePrecision(price, pricePrecision)) {
      return next(
        new AppError(
          `Price can have maximum ${pricePrecision} decimal place(s) for ${symbol}`,
          400
        )
      );
    }
  }

  // stopLossPrice
  if (stopLossPrice !== undefined) {
    if (!validatePrecision(stopLossPrice, pricePrecision)) {
      return next(
        new AppError(
          `stopLossPrice can have maximum ${pricePrecision} decimal place(s) for ${symbol}`,
          400
        )
      );
    }
  }

  // takeProfitPrice
  if (takeProfitPrice !== undefined) {
    if (!validatePrecision(takeProfitPrice, pricePrecision)) {
      return next(
        new AppError(
          `takeProfitPrice can have maximum ${pricePrecision} decimal place(s) for ${symbol}`,
          400
        )
      );
    }
  }

  const userData = await getPi42User(userId, accountId);

  if (!userData) {
    return next(new AppError("Pi42 account not found for the user", 404));
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

  // ========================
  // Save to Database using service
  // ========================
  // try {
  //   // await createPi42Order(userData._id, response);
  // } catch (saveErr) {
  //   console.error("❌ Failed to save Pi42Order to DB:", saveErr);
  //   // We still return success because order was placed on exchange
  // }

  res.status(200).json({
    status: true,
    message: "Order placed successfully",
    data: response,
  });
});

exports.placeOrderWithLeverage = catchAsync(async (req, res, next) => {
  const {
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
    stopPrice
  } = req.body;

  const { userId, accountId } = req.pi42Account;

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

  // ====================== STOP ORDER VALIDATIONS ======================
  
  if (type === "STOP_MARKET") {
    if (!stopPrice) {
      return next(new AppError("stopPrice is required for STOP_MARKET order", 400));
    }
  }

  if (type === "STOP_LIMIT") {
    if (!stopPrice) {
      return next(new AppError("stopPrice is required for STOP_LIMIT order", 400));
    }
    if (!price) {
      return next(new AppError("price (Limit Price) is required for STOP_LIMIT order", 400));
    }
  }

  // ====================== BASIC VALIDATIONS ======================

  if (type === "LIMIT" && !price) {
    return next(new AppError("price is required for LIMIT orders", 400));
  }

  let pairData = null;

  if (symbol) {
    pairData = await Pi42Pairs.findOne({ name: symbol });

    if (!pairData) {
      return next(
        new AppError(`Pair configuration not found for symbol: ${symbol}`, 404)
      );
    }
  }

  if (symbol && pairData) {
    const quantityPrecision = Number(pairData.quantityPrecision);
    const pricePrecision = Number(pairData.pricePrecision);

    // quantity validation
    if (!validatePrecision(quantity, quantityPrecision)) {
      return next(
        new AppError(
          `Quantity can have maximum ${quantityPrecision} decimal place(s) for ${symbol}`,
          400
        )
      );
    }

    // price validation
    if (
      price !== undefined &&
      !validatePrecision(price, pricePrecision)
    ) {
      return next(
        new AppError(
          `Price can have maximum ${pricePrecision} decimal place(s) for ${symbol}`,
          400
        )
      );
    }

    // stopLossPrice validation
    if (
      stopLossPrice !== undefined &&
      !validatePrecision(stopLossPrice, pricePrecision)
    ) {
      return next(
        new AppError(
          `stopLossPrice can have maximum ${pricePrecision} decimal place(s) for ${symbol}`,
          400
        )
      );
    }

    // takeProfitPrice validation
    if (
      takeProfitPrice !== undefined &&
      !validatePrecision(takeProfitPrice, pricePrecision)
    ) {
      return next(
        new AppError(
          `takeProfitPrice can have maximum ${pricePrecision} decimal place(s) for ${symbol}`,
          400
        )
      );
    }
  }


  // const userData = await Pi42Account.findOne({ pi42UserId: userId, pi42AccountId: accountId });
  const userData = await getPi42User(userId, accountId);

  if (!userData) {
    return next(new AppError("Pi42 account not found for the user", 404));
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
    leverage: Number(leverage)
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
  if (stopPrice) body.stopPrice = Number(stopPrice);

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
        err?.response?.data?.details ||
        "Failed to place order with leverage",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Order placement failed", 500));
  }

  // try {
  //   await createPi42Order(userData._id, response);
  // } catch (saveErr) {
  //   console.error("❌ Failed to save Pi42Order to DB:", saveErr);
  //   // We still return success because order was placed on exchange
  // }

  res.status(200).json({
    status: true,
    message: "Order placed with leverage successfully",
    data: response,
  });
});

exports.getOrderByClientOrderId = catchAsync(async (req, res, next) => {
  const { clientOrderId } = req.query;

  const { userId, accountId } = req.pi42Account;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
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
  const { clientOrderIds } = req.body;

  const { userId, accountId } = req.pi42Account;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
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
    startTimestamp,
    endTimestamp,
    sortOrder = "desc",
    pageSize = 50,
  } = req.query;

  const { userId, accountId } = req.pi42Account;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
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

exports.editOrder = catchAsync(async (req, res, next) => {
  const {
    clientOrderId,
    quantity,
    price,
    stopPrice,
    type, // 👈 IMPORTANT (LIMIT / STOP_LIMIT / STOP_MARKET)
  } = req.body;

  const { userId, accountId } = req.pi42Account;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
  }

  if (!clientOrderId) {
    return next(
      new AppError("clientOrderId is required", 400)
    );
  }

  if (!quantity && !price && !stopPrice) {
    return next(
      new AppError(
        "At least one field (quantity, price, stopPrice) is required",
        400
      )
    );
  }

  // 🔥 numeric validations
  if (quantity && Number(quantity) <= 0) {
    return next(new AppError("quantity must be > 0", 400));
  }

  if (price && Number(price) <= 0) {
    return next(new AppError("price must be > 0", 400));
  }

  if (stopPrice && Number(stopPrice) <= 0) {
    return next(new AppError("stopPrice must be > 0", 400));
  }

  // 🔥 type-based validation (IMPORTANT)
  if (price && !["LIMIT", "STOP_LIMIT"].includes(type)) {
    return next(
      new AppError(
        "price can only be used with LIMIT or STOP_LIMIT orders",
        400
      )
    );
  }

  if (
    stopPrice &&
    !["STOP_LIMIT", "STOP_MARKET"].includes(type)
  ) {
    return next(
      new AppError(
        "stopPrice can only be used with STOP_LIMIT or STOP_MARKET orders",
        400
      )
    );
  }

  const userData = await getPi42User(userId, accountId);

  if (!userData) {
    return next(new AppError("Pi42 account not found for the user", 404));
  }

  const endpoint = `/v1/order/edit-order`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔹 body (only send provided fields)
  const body = {
    clientOrderId,
  };

  if (quantity) body.quantity = Number(quantity);
  if (price) body.price = Number(price);
  if (stopPrice) body.stopPrice = Number(stopPrice);

  let response;

  try {
    const apiRes = await axios.patch(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Edit Order Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to edit order",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Order edit failed", 500));
  }

  res.status(200).json({
    status: true,
    message: "Order edited successfully",
    data: response,
  });
});

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { clientOrderId } = req.body;

  const { userId, accountId } = req.pi42Account;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
  }

  if (!clientOrderId) {
    return next(new AppError("clientOrderId is required", 400));
  }

  const userData = await getPi42User(userId, accountId);

  if (!userData) {
    return next(new AppError("Pi42 account not found for the user", 404));
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

  await cancelPi42Order(clientOrderId);

  res.status(200).json({
    status: true,
    message: "Order cancelled successfully",
    data: response,
  });
});

exports.cancelAllOrders = catchAsync(async (req, res, next) => {
  const { symbols, baseAsset, marginAsset } = req.body;

  const { userId, accountId } = req.pi42Account;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
  }

  const userData = await getPi42User(userId, accountId);

  if (!userData) {
    return next(new AppError("Pi42 account not found for the user", 404));
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
    body.symbols = symbols;  // BTCINR, ETHINR, INJINR etc.
  }

  if (baseAsset) {
    body.baseAsset = baseAsset; // BTC, ETH, INJ etc.
  }

  if (marginAsset) {
    body.marginAsset = marginAsset; // INR, USDT etc.
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

  try {
    await cancelAllPi42Orders(userData._id, {
      symbols,
      baseAsset,
      marginAsset,
    });
  } catch (dbErr) {
    console.error("❌ Failed to update orders in DB:", dbErr);
    // We don't fail the request — exchange already cancelled them
  }

  res.status(200).json({
    status: true,
    message: "All orders cancelled successfully",
    data: response,
  });
});