const axios = require("axios");

const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");

exports.getPositions = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    positionStatus, // OPEN | CLOSED | LIQUIDATED
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

  if (!positionStatus) {
    return next(
      new AppError("positionStatus is required (OPEN, CLOSED, LIQUIDATED)", 400)
    );
  }

  const allowedStatus = ["OPEN", "CLOSED", "LIQUIDATED"];
  if (!allowedStatus.includes(positionStatus)) {
    return next(
      new AppError("Invalid positionStatus", 400)
    );
  }

  if (Number(pageSize) > 100) {
    return next(new AppError("pageSize max is 100", 400));
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    return next(new AppError("Invalid sortOrder", 400));
  }

  const endpoint = `/v1/positions/${positionStatus}`;
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

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params,
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Positions Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Failed to fetch positions",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No positions found", 500));
  }

  res.status(200).json({
    status: true,
    message: `${positionStatus} positions fetched successfully`,
    data: response,
  });
});


exports.getPositionById = catchAsync(async (req, res, next) => {
  const { userId, accountId, positionId } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (!positionId) {
    return next(
      new AppError("positionId is required", 400)
    );
  }

  const endpoint = `/v1/positions`;
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
    positionId,
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
      "❌ PI42 Get Position Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Failed to fetch position",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Position not found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Position fetched successfully",
    data: response,
  });
});


exports.getPositionsHistory = catchAsync(async (req, res, next) => {
  // ?status=CLOSED&status=LIQUIDATED
  const {
    userId,
    accountId,
    startTimestamp,
    endTimestamp,
    sortOrder = "desc",
    pageSize = 50,
    symbol,
    status, // can be string OR array
  } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (Number(pageSize) < 5 || Number(pageSize) > 100) {
    return next(
      new AppError("pageSize must be between 5 and 100", 400)
    );
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    return next(new AppError("Invalid sortOrder", 400));
  }

  const endpoint = `/v1/positions/history`;
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
  if (symbol) params.symbol = symbol;

  // 🔥 status handling (important)
  if (status) {
    if (Array.isArray(status)) {
      params.status = status; // multiple status
    } else {
      params.status = [status]; // single → convert to array
    }
  }

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params,
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Positions History Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Failed to fetch positions history",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No positions history found", 500));
  }

  res.status(200).json({
    status: true,
    message: "Positions history fetched successfully",
    data: response,
  });
});


exports.closeAllPositions = catchAsync(async (req, res, next) => {
  const { userId, accountId, marginAsset="INR" } = req.query;

  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  const endpoint = `/v1/positions/close-all-positions`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔹 query params (optional)
  const params = {};

  if (marginAsset) {
    params.marginAsset = marginAsset;
  }

  let response;

  try {
    const apiRes = await axios.delete(url, {
      headers,
      params, // 👈 query params
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Close All Positions Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Failed to close all positions",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No positions closed", 500));
  }

  res.status(200).json({
    status: true,
    message: "All positions closed successfully",
    data: response,
  });
});


exports.getMultiplePositions = catchAsync(async (req, res, next) => {
  const { userId, accountId, positionIds } = req.body;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (!positionIds || !Array.isArray(positionIds)) {
    return next(
      new AppError("positionIds must be an array", 400)
    );
  }

  if (positionIds.length === 0) {
    return next(
      new AppError("positionIds cannot be empty", 400)
    );
  }

  if (positionIds.length > 100) {
    return next(
      new AppError("Maximum 100 positionIds allowed", 400)
    );
  }

  const endpoint = `/v1/positions/get-multiple`;
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
    positionIds,
  };

  let response;

  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Get Multiple Positions Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Failed to fetch positions",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No positions found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Positions fetched successfully",
    data: response,
  });
});

// auto top up for a position
exports.setAutoTopUp = catchAsync(async (req, res, next) => {
  const { userId, accountId, positionId, autoTopUp } = req.body;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (!positionId) {
    return next(
      new AppError("positionId is required", 400)
    );
  }

  if (typeof autoTopUp !== "boolean") {
    return next(
      new AppError("autoTopUp must be true or false", 400)
    );
  }

  const endpoint = `/v1/positions/auto-top-up`;
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
    positionId,
    autoTopUp,
  };

  let response;

  try {
    const apiRes = await axios.patch(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Auto Top-Up Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Failed to update auto top-up",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Auto top-up update failed", 500));
  }

  res.status(200).json({
    status: true,
    message: `Auto top-up ${autoTopUp ? "enabled" : "disabled"} successfully`,
    data: response,
  });
});


exports.setAutoTopUpPreference = catchAsync(async (req, res, next) => {
  const { userId, accountId, autoTopUp } = req.body;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (typeof autoTopUp !== "boolean") {
    return next(
      new AppError("autoTopUp must be true or false", 400)
    );
  }

  const endpoint = `/v1/user/set-auto-top-up-preference`;
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
    autoTopUp,
  };

  let response;

  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Auto Top-Up Preference Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Failed to update auto top-up preference",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Auto top-up preference update failed", 500));
  }

  res.status(200).json({
    status: true,
    message: `Auto top-up preference ${autoTopUp ? "enabled" : "disabled"} successfully`,
    data: response,
  });
});


exports.reversePosition = catchAsync(async (req, res, next) => {
  const { userId, accountId, positionId } = req.body;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (!positionId) {
    return next(
      new AppError("positionId is required", 400)
    );
  }

  const endpoint = `/v1/positions/reverse-position`;
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
    positionId,
  };

  let response;

  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Reverse Position Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.details || "Failed to reverse position",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Position reverse failed", 500));
  }

  res.status(200).json({
    status: true,
    message: "Position reversed successfully",
    data: response,
  });
});