const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");
const { getPi42User } = require("../../../services/pi42UserService");

exports.getTransactionHistory = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    startTimestamp,
    endTimestamp,
    sortOrder = "desc",
    pageSize = 100,
    tradeId,
    positionId,
  } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (Number(pageSize) > 100) {
    return next(
      new AppError("pageSize max is 100", 400)
    );
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    return next(new AppError("Invalid sortOrder", 400));
  }

  // ❗ Important rule
  if (tradeId && positionId) {
    return next(
      new AppError("Do not pass both tradeId and positionId together", 400)
    );
  }

  const userData = await getPi42User(userId, accountId);
  if (!userData) {
    return next(new AppError("User not found", 404));
  }

  const endpoint = `/v1/user-data/transaction-history`;
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
    sortOrder,
    pageSize: Number(pageSize),
  };

  if (startTimestamp) params.startTimestamp = Number(startTimestamp);
  if (endTimestamp) params.endTimestamp = Number(endTimestamp);
  if (tradeId) params.tradeId = Number(tradeId);
  if (positionId) params.positionId = positionId;

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params,
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Transaction History Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message ||
          "Failed to fetch transaction history",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No transaction history found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Transaction history fetched successfully",
    data: response,
  });
});


exports.getTransactionHistorySync = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    id, // cursor
    sortOrder = "desc",
    pageSize = 100,
    tradeId,
    positionId,
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
    return next(new AppError("pageSize max is 100", 400));
  }

  // ❗ rule
  if (tradeId && positionId) {
    return next(
      new AppError("Do not pass both tradeId and positionId together", 400)
    );
  }

  const endpoint = `/v1/user-data/transaction-history-sync`;
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
  if (tradeId) params.tradeId = Number(tradeId);
  if (positionId) params.positionId = positionId;

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params,
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Transaction Sync Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message ||
          "Failed to fetch transaction history",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No transaction data found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Transaction history fetched successfully",
    // nextId: response?.nextId || null, // 🔥 important for pagination
    data: response,
  });
});


exports.getTransactionHistoryById = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    id,  // pass id field of transaction-history-sync response
  } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (!id) {
    return next(new AppError("id is required", 400));
  }

  const transactionId = Number(id);
  if (isNaN(transactionId)) {
    return next(new AppError("id must be a number", 400));
  }

  const endpoint = `/v1/user-data/transaction-history/${transactionId}`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Transaction By ID Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message ||
          "Failed to fetch transaction by id",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Transaction not found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Transaction fetched successfully",
    data: response,
  });
});