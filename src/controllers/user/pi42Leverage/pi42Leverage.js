const axios = require("axios");

const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");


exports.updateLeverage = catchAsync(async (req, res, next) => {
  const { leverage, contractName } = req.body;

  const { userId, accountId } = req.pi42Account;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
  }

  if (!leverage || !contractName) {
    return next(
      new AppError("leverage and contractName are required", 400)
    );
  }

  if (Number(leverage) < 1 || Number(leverage) > 75) {
    return next(
      new AppError("Leverage must be between 1 and 75", 400)
    );
  }

  const endpoint = `/v1/exchange/update/leverage`;
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
    leverage: Number(leverage),
    contractName,
  };

  let response;

  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Update Leverage Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to update leverage",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Leverage update failed", 500));
  }

  res.status(200).json({
    status: true,
    message: `Leverage updated to ${leverage}x successfully`,
    data: response,
  });
});