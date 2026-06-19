const axios = require('axios');
const catchAsync = require('./../../../../utils/catchAsync');
const AppError = require('./../../../../utils/AppError');
const buildHeaders = require('./../../../../utils/buildHeaders');



exports.transferBalance = catchAsync(async (req, res, next) => {
  const { user, from, to, amount } = req.body;

  const { userId, accountId } = req.pi42Account;

  // Validation
  if (!from || !to || !amount) {
    return next(new AppError("from, to and amount are required", 400));
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return next(new AppError("amount must be a positive number", 400));
  }

  const endpoint = `/v1/wallet/transfer-balance`;
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  const body = { from, to, amount };

  let response;
  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Transfer Balance Error:", err?.response?.data || err.message);

    return next(
      new AppError(
        err?.response?.data?.message || 
        err?.response?.data?.error || 
        "Failed to transfer balance",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Balance transferred successfully",
    data: response,
  });
});


exports.getOptionsWalletBalance = catchAsync(async (req, res, next) => {
  const { user, marginAsset } = req.query;

  const { userId, accountId } = req.pi42Account;

  const endpoint = `/v1/wallet/options-wallet/details`;
  let url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  if (marginAsset) {
    url += `?marginAsset=${encodeURIComponent(marginAsset.trim().toUpperCase())}`;
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
    console.error("❌ PI42 Get Options Wallet Balance Error:", err?.response?.data || err.message);

    return next(
      new AppError(
        err?.response?.data?.message || 
        err?.response?.data?.error || 
        "Failed to fetch options wallet balance",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Options wallet balance fetched successfully",
    data: response,
  });
});