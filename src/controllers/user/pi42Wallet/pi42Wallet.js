const crypto = require("crypto");
const axios = require("axios");


const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");

const generateReferenceIdForDeposit = () => {
  return `dep_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};

const generateReferenceIdForWithdrawl = () => {
  return `wd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};


exports.depositINR = catchAsync(async (req, res, next) => {
  const { userId, accountId, amount } = req.body; //teeno number mein hona chahiye

  if (!userId || !amount) {
    return next(new AppError("userId and amount are required", 400));
  }

  if (Number(amount) <= 0) {
    return next(new AppError("Amount must be greater than 0", 400));
  }

  // 🔹 Get user's Pi42 account
  // const account = await Pi42SubAccount.findOne({ userId, type: "MAIN" });

  // if (!account) {
  //   return next(new AppError("Pi42 account not found for user", 404));
  // }

  const endpoint = `/v1/integration/deposit-inr`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers (userId + accountId required)
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔥 referenceId (VERY IMPORTANT)
  const referenceId = generateReferenceIdForDeposit();

  // 🔹 body (as per docs)
  const body = {
    amount: Number(amount),
    referenceId,
  };

  let response;

  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Deposit Error:", err?.response?.data || err.message);

    return next(
      new AppError(
        err?.response?.data?.message || "PI42 deposit failed",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Failed to deposit INR", 500));
  }

  res.status(200).json({
    status: true,
    message: "INR deposited successfully",
    data: {
      referenceId,
      ...response,
    },
  });
});


exports.withdrawINR = catchAsync(async (req, res, next) => {
  const { userId, accountId, amount } = req.body; // numbers hone chahiye

  if (!userId || !accountId || !amount) {
    return next(new AppError("userId, accountId and amount are required", 400));
  }

  if (Number(amount) <= 0) {
    return next(new AppError("Amount must be greater than 0", 400));
  }

  const endpoint = `/v1/integration/withdraw-inr`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    userId,
    accountId
  );

  // 🔥 referenceId (VERY IMPORTANT)
  const referenceId = generateReferenceIdForWithdrawl();

  // 🔹 body
  const body = {
    amount: Number(amount),
    referenceId,
  };

  let response;

  console.log("=============", body)
  console.log(">>>>>>>>>>>>>>>>>>>>>>>", headers)


  try {
    const apiRes = await axios.post(url, body, { headers });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Withdraw Error:", err?.response?.data || err.message);

    return next(
      new AppError(
        err?.response?.data?.message || "PI42 withdraw failed",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Failed to withdraw INR", 500));
  }

  res.status(200).json({
    status: true,
    message: "INR withdrawn successfully",
    data: {
      referenceId,
      ...response,
    },
  });
});


exports.getDepositWithdrawHistory = catchAsync(async (req, res, next) => {
  const {
    userId,
    accountId,
    page = 1,
    pageSize = 10,
    type,
    from,
    to,
    marginAsset="INR",
  } = req.body;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
  }

  if (Number(page) < 1) {
    return next(new AppError("page must be >= 1", 400));
  }

  if (Number(pageSize) < 5 || Number(pageSize) > 100) {
    return next(new AppError("pageSize must be between 5 and 100", 400));
  }

  const endpoint = `/v1/integration/deposit-withdraw-history`;
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
    page: Number(page),
    pageSize: Number(pageSize),
  };

  if (type) params.type = type;
  if (from) params.from = from;
  if (to) params.to = to;
  if (marginAsset) params.marginAsset = marginAsset;

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params,
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 History Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch history",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No history data found", 500));
  }

  res.status(200).json({
    status: true,
    message: "Deposit/Withdraw history fetched successfully",
    data: response,
  });
});


exports.getFuturesWalletDetails = catchAsync(async (req, res, next) => {
  const { userId, accountId, marginAsset = "INR" } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  if (!["INR", "USDT"].includes(marginAsset)) {
    return next(
      new AppError("marginAsset must be INR or USDT", 400)
    );
  }

  const endpoint = `/v1/wallet/futures-wallet/details`;
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
    marginAsset,
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
      "❌ PI42 Wallet Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch wallet details",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Wallet data not found", 404));
  }

  res.status(200).json({
    status: true,
    message: "Wallet details fetched successfully",
    data: response,
  });
});