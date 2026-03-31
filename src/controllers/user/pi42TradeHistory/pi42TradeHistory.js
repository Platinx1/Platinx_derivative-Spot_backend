const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");



exports.getTradeHistory = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    startTimestamp,
    endTimestamp,
    sortOrder = "desc",
    pageSize = 100,
  } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

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
    userId,
    accountId,
    id,
    sortOrder = "desc",
    pageSize = 100,
  } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

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
  const { userId, accountId, id } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

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