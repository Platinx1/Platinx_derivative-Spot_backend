const axios = require('axios');
const catchAsync = require('./../../../../utils/catchAsync');
const AppError = require('./../../../../utils/AppError');
const buildHeaders = require('./../../../../utils/buildHeaders');


exports.getOpenPositions = catchAsync(async (req, res, next) => {
  const {
    user,
    startTimestamp,
    endTimestamp,
    sortOrder = "desc",
    pageSize,
    symbol,
    id
  } = req.query;

  const { userId, accountId } = req.pi42Account;

  let url = `${process.env.PI42_OPTIONS_BASE_URL}/v1/positions/open-positions`;

  const params = new URLSearchParams();
  if (startTimestamp) params.append('startTimestamp', startTimestamp);
  if (endTimestamp) params.append('endTimestamp', endTimestamp);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (pageSize) params.append('pageSize', pageSize);
  if (symbol) params.append('symbol', symbol);
  if (id) params.append('id', id);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  let response;
  try {
    const apiRes = await axios.get(url, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Open Positions Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch open positions",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Open positions fetched successfully",
    data: response
  });
});


exports.getPositionHistory = catchAsync(async (req, res, next) => {
  const {
    user,
    startTimestamp,
    endTimestamp,
    sortOrder = "desc",
    pageSize,
    symbol,
    id
  } = req.query;

  const { userId, accountId } = req.pi42Account;

  let url = `${process.env.PI42_OPTIONS_BASE_URL}/v1/positions/position-history`;

  const params = new URLSearchParams();
  if (startTimestamp) params.append('startTimestamp', startTimestamp);
  if (endTimestamp) params.append('endTimestamp', endTimestamp);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (pageSize) params.append('pageSize', pageSize);
  if (symbol) params.append('symbol', symbol);
  if (id) params.append('id', id);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  let response;
  try {
    const apiRes = await axios.get(url, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Position History Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch position history",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Position history fetched successfully",
    data: response,
  });
});