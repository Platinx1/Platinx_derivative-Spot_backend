// controllers/pi42/orderController.js

const axios = require('axios');
const catchAsync = require('./../../../../utils/catchAsync');
const AppError = require('./../../../../utils/AppError');
const buildHeaders = require('./../../../../utils/buildHeaders');


// exports.placeOptionsOrder = catchAsync(async (req, res, next) => {
//   const { user } = req.body;
//   const { userId, accountId } = req.pi42Account;

//   const body = req.body; // Contains placeType, symbol, side, type, price, quantity, etc.

//   if (!body.symbol || !body.type || !body.placeType) {
//     return next(new AppError("symbol, type and placeType are required", 400));
//   }

//   const endpoint = `/v1/order/place-order`;
//   const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

//   const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE, userId, accountId);

//   let response;
//   try {
//     const apiRes = await axios.post(url, body, { headers });
//     response = apiRes.data;
//   } catch (err) {
//     console.error("❌ PI42 Place Order Error:", err?.response?.data || err.message);
//     return next(
//       new AppError(
//         err?.response?.data?.message || err?.response?.data?.error || "Failed to place order",
//         err?.response?.status || 500
//       )
//     );
//   }

//   res.status(201).json({
//     status: true,
//     message: "Order placed successfully",
//     data: {
//       user,
//       ...response
//     }
//   });
// });


exports.placeOptionsOrder = catchAsync(async (req, res, next) => {
    const {
    user,
    placeType,
    symbol,
    type,
    side,
    quantity,
    price,
    positionId,
    refId
  } = req.body;

  const { userId, accountId } = req.pi42Account;

  // Basic Validation
  if (!placeType || !symbol || !type) {
    return next(new AppError("placeType, symbol and type are required", 400));
  }

  if (!["ORDER_FORM", "POSITION"].includes(placeType)) {
    return next(new AppError("placeType must be either ORDER_FORM or POSITION", 400));
  }

  if (!["MARKET", "LIMIT"].includes(type)) {
    return next(new AppError("type must be either MARKET or LIMIT", 400));
  }

  // Validation based on placeType
  if (placeType === "POSITION") {
    if (!positionId) {
      return next(new AppError("positionId is required when placeType is POSITION", 400));
    }
    if (!side) {
      return next(new AppError("side is required when placeType is POSITION", 400));
    }
    if (!quantity) {
      return next(new AppError("quantity is required when placeType is POSITION", 400));
    }
  }

  // Validation for LIMIT orders
  if (type === "LIMIT" && !price) {
    return next(new AppError("price is required when order type is LIMIT", 400));
  }

  // Build clean request body (as per documentation)
  const requestBody = {
    placeType,
    symbol: symbol.trim(),
    type,
    refId: refId || undefined
  };

  // Add fields based on placeType
  if (placeType === "POSITION") {
    requestBody.quantity = quantity;
    requestBody.side = side;
    requestBody.positionId = positionId;
    if (type === "LIMIT") {
      requestBody.price = price;
    }
  } else {
    // ORDER_FORM
    requestBody.quantity = quantity;
    if (side) requestBody.side = side;
    if (type === "LIMIT") {
      requestBody.price = price;
    }
  }

  const endpoint = `/v1/order/place-order`;
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  let response;
  try {
    const apiRes = await axios.post(url, requestBody, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Place Order Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to place order",
        err?.response?.status || 500
      )
    );
  }

  res.status(201).json({
    status: true,
    message: "Order placed successfully",
    data: response
  });
});


exports.getOpenOptionsOrders = catchAsync(async (req, res, next) => {

  const { user, startTimestamp, endTimestamp, sortOrder, pageSize, symbol, id } = req.query;
  const { userId, accountId } = req.pi42Account;

  let url = `${process.env.PI42_OPTIONS_BASE_URL}/v1/order/open-orders`;

  const params = new URLSearchParams();
  if (startTimestamp) params.append('startTimestamp', startTimestamp);
  if (endTimestamp) params.append('endTimestamp', endTimestamp);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (pageSize) params.append('pageSize', pageSize);
  if (symbol) params.append('symbol', symbol);
  if (id) params.append('id', id);

  if (params.toString()) url += `?${params.toString()}`;

  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE, userId, accountId);

  let response;
  try {
    const apiRes = await axios.get(url, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Open Orders Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch open orders",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Open orders fetched successfully",
    data: response,
  });
});


exports.getOptionsOrderHistory = catchAsync(async (req, res, next) => {
  const { user, startTimestamp, endTimestamp, sortOrder, pageSize, symbol, id } = req.query;
  const { userId, accountId } = req.pi42Account;

  let url = `${process.env.PI42_OPTIONS_BASE_URL}/v1/order/order-history`;

  const params = new URLSearchParams();
  if (startTimestamp) params.append('startTimestamp', startTimestamp);
  if (endTimestamp) params.append('endTimestamp', endTimestamp);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (pageSize) params.append('pageSize', pageSize);
  if (symbol) params.append('symbol', symbol);
  if (id) params.append('id', id);

  if (params.toString()) url += `?${params.toString()}`;

  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE, userId, accountId);

  let response;
  try {
    const apiRes = await axios.get(url, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Order History Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch order history",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Order history fetched successfully",
    data: response
  });
});


exports.getOptionsOrderDetails = catchAsync(async (req, res, next) => {
  const { user, clientOrderId } = req.query;

  const { userId, accountId } = req.pi42Account;

  if (!clientOrderId) {
    return next(new AppError("clientOrderId is required", 400));
  }

  const url = `${process.env.PI42_OPTIONS_BASE_URL}/v1/order?clientOrderId=${encodeURIComponent(clientOrderId)}`;

  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE, userId, accountId);

  let response;
  try {
    const apiRes = await axios.get(url, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Order Details Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch order details",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Order details fetched successfully",
    data: response
  });
});


exports.getOptionsOrderByRefId = catchAsync(async (req, res, next) => {
  const { user, refId } = req.query;
  
  const { userId, accountId } = req.pi42Account;

  if (!refId) {
    return next(new AppError("refId is required", 400));
  }

  const url = `${process.env.PI42_OPTIONS_BASE_URL}/v1/order/ref-id?refId=${encodeURIComponent(refId)}`;

  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE, userId, accountId);

  let response;
  try {
    const apiRes = await axios.get(url, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Ref Order Details Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch order by refId",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Order fetched successfully by refId",
    data: response
  });
});


exports.deleteOptionsOrder = catchAsync(async (req, res, next) => {
  const { user, clientOrderId } = req.body;
  const { userId, accountId } = req.pi42Account;

  if (!clientOrderId) {
    return next(new AppError("clientOrderId is required", 400));
  }

  const endpoint = `/v1/order/delete-order`;
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE, userId, accountId);

  const body = { clientOrderId };

  let response;
  try {
    const apiRes = await axios.delete(url, { data: body, headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Delete Order Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to delete order",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Order cancellation request sent successfully",
    data: response
  });
});


exports.editOptionsOrder = catchAsync(async (req, res, next) => {
  const { user, clientOrderId, quantity, price, orderId } = req.body;
  const { userId, accountId } = req.pi42Account;

  if (!clientOrderId) {
    return next(new AppError("clientOrderId is required", 400));
  }

  const endpoint = `/v1/order/edit-order`;
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE, userId, accountId);

  const body = { clientOrderId, quantity, price, orderId };

  let response;
  try {
    const apiRes = await axios.patch(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Edit Order Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to edit order",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Edit order request submitted successfully",
    data: response
  });
});


exports.deleteAllOptionsOrders = catchAsync(async (req, res, next) => {
  const { user } = req.body;
  const { userId, accountId } = req.pi42Account;

  const endpoint = `/v1/order/delete-all-orders`;
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE, userId, accountId);

  let response;
  try {
    const apiRes = await axios.delete(url, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Delete All Orders Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to delete all orders",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Cancel all orders request sent successfully",
    data: response
  });
});