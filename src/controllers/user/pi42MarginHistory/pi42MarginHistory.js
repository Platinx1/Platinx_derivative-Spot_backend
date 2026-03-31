const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");


exports.getMarginHistorySync = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    id,
    pageSize = 100,
    symbol,
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

  const endpoint = `/v1/user-data/margin-history-sync`;
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
    pageSize: Number(pageSize),
  };

  if (id) params.id = Number(id);
  if (symbol) params.symbol = symbol;

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params,
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Margin History Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message ||
          "Failed to fetch margin history",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No margin history found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Margin history fetched successfully",
    // nextId: response?.nextId || null, // 🔥 important for pagination
    data: response,
  });
});