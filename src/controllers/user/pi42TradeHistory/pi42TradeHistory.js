const axios = require("axios");
const moment = require('moment-timezone');
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");
const Pi42Trade = require("../../../models/pi42Models/pi42Trade");



exports.getTradeHistory = catchAsync(async (req, res, next) => {
  const {
    startTimestamp,
    endTimestamp,
    sortOrder = "desc",
    pageSize = 100,
  } = req.query;

  const { userId, accountId } = req.pi42Account;

  if (!["asc", "desc"].includes(sortOrder)) {
    return next(new AppError("Invalid sortOrder", 400));
  }

  if (Number(pageSize) > 100) {
    return next(
      new AppError("pageSize max is 100", 400)
    );
  }

  const endpoint = `/v1/user-data/trade-history`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔹 query params (only if provided)
  const params = {
    sortOrder,
    pageSize: Number(pageSize),
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
      "❌ PI42 Trade History Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch trade history",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No trade history found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Trade history fetched successfully",
    data: response,
  });
});


exports.getTradeHistorySync = catchAsync(async (req, res, next) => {
  const {
    id,
    sortOrder = "desc",
    pageSize = 100,
  } = req.query;

  const { userId, accountId } = req.pi42Account;

  if (!["asc", "desc"].includes(sortOrder)) {
    return next(new AppError("Invalid sortOrder", 400));
  }

  if (Number(pageSize) > 100) {
    return next(
      new AppError("pageSize max is 100", 400)
    );
  }

  const endpoint = `/v1/user-data/trade-history-sync`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔹 params
  const params = {
    sortOrder,
    pageSize: Number(pageSize),
  };

  if (id) params.id = Number(id);

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params,
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Trade History Sync Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message ||
          "Failed to fetch trade history",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No trade history found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Trade history fetched successfully",
    // nextId: response?.nextId || null, // 🔥 important
    data: response,
  });
});


exports.getTradeHistoryById = catchAsync(async (req, res, next) => {
  const { id } = req.query;

  const { userId, accountId } = req.pi42Account;

  if (!id) {
    return next(new AppError("trade id is required", 400));
  }

  // ✅ only id in path
  const endpoint = `/v1/user-data/trade-history/${id}`;
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
    const apiRes = await axios.get(url, {
      headers,
      // ❌ no params
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Trade History By ID Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message ||
          "Failed to fetch trade history by id",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Trade not found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Trade history fetched successfully",
    data: response,
  });
});

// getting from db
exports.getTradesByPosition = catchAsync(async (req, res, next) => {
  const { positionId, side } = req.query;

  if (!positionId) {
    return next(new AppError("positionId is required", 400));
  }

  if(!side) {
    return next(new AppError("side is required", 400));
  }

  const filter = {
    positionId: positionId,
  };

  // Side filter (optional)
  if (side) {
    filter.side = side.toUpperCase();
  }

  // Fetch all trades - newest first
  const trades = await Pi42Trade.find(filter)
    .sort({ pi42TradeTime: -1 })   // Descending order (newest first)
    .lean();

  // Format response
  const formattedData = trades.map(trade => ({
    tradeId: trade.tradeId,
    contractPair: trade.contractPair,
    side: trade.side,
    tradeRole: trade.tradeRole,
    price: Number(trade.price),
    quantity: Number(trade.quantity),
    realizedPnl: Number(trade.realizedPnl),
    commission: Number(trade.commission),
    commissionAsset: trade.commissionAsset,
    marginAsset: trade.marginAsset,
    date: trade.pi42TradeTime
      ? moment(trade.pi42TradeTime)
          .tz('Asia/Kolkata')
          .format('DD MMM YYYY, hh:mm a')
      : '',
    pi42TradeTime: trade.pi42TradeTime,
  }));

  res.status(200).json({
    status: true,
    message: "Trades fetched successfully",
    data: formattedData,
  });
});