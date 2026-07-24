const crypto = require("crypto");
const axios = require("axios");
const moment = require('moment-timezone');

const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");
const { getPi42User, getPi42UserByPlatinxUserId } = require("../../../services/pi42UserService");
const { createDepositTransaction, createWithdrawalTransaction } = require("../../../services/pi42WalletTransactionService");
const { createFuturesWallet, upsertFuturesWallet } = require("../../../services/pi42WalletService");
const Pi42WalletTransaction = require('../../../models/pi42Models/pi42WalletTransaction'); // adjust path

const generateReferenceIdForDeposit = () => {
  return `dep_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};

const generateReferenceIdForWithdrawl = () => {
  return `wd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};


// exports.depositINR = catchAsync(async (req, res, next) => {
//   const { amount } = req.body;

//   // ✅ Everything comes from middleware now
//   const { id, userId, accountId } = req.pi42Account;

//   if (!amount) {
//     return next(new AppError("amount is required", 400));
//   }

//   if (Number(amount) <= 0) {
//     return next(new AppError("Amount must be greater than 0", 400));
//   }

//   const endpoint = `/v1/integration/deposit-inr`;
//   const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

//   // 🔹 headers (userId + accountId required)
//   const headers = buildHeaders(
//     process.env.PARTNER_NAME,
//     process.env.API_COOKIE,
//     userId,
//     accountId
//   );

//   // 🔥 referenceId (VERY IMPORTANT)
//   const referenceId = generateReferenceIdForDeposit();

//   // 🔹 body (as per docs)
//   const body = {
//     amount: Number(amount),
//     referenceId,
//   };

//   let response;

//   try {
//     const apiRes = await axios.post(url, body, { headers });
//     response = apiRes.data;
//   } catch (err) {
//     console.error("❌ PI42 Deposit Error:", err?.response?.data || err.message);

//     return next(
//       new AppError(
//         err?.response?.data?.message || "PI42 deposit failed",
//         err?.response?.status || 500
//       )
//     );
//   }

//   if (!response) {
//     return next(new AppError("Failed to deposit INR", 500));
//   }

//   try {
//     await createDepositTransaction(
//       id,           // pi42Account
//       response,
//       Number(amount),         // requested amount
//       referenceId
//     );
//   } catch (saveErr) {
//     console.error("❌ Failed to save deposit transaction to DB:", saveErr);
//     // We still return success because deposit succeeded on Pi42 side
//   }

//   res.status(200).json({
//     status: true,
//     message: "INR deposited successfully",
//     data: {
//       referenceId,
//       ...response,
//     },
//   });
// });


exports.depositINR = catchAsync(async (req, res, next) => {
  const { user, amount } = req.body;

  // ✅ Everything comes from middleware now
  const { id, userId, accountId } = req.pi42Account;

  if (!amount) return next(new AppError("amount is required", 400));
  if (Number(amount) <= 0) return next(new AppError("Amount must be greater than 0", 400));

  /**
   * =========================================
   * STEP 1: Deduct amount from Futures Wallet
   * =========================================
   */

  try {
    const futuresUrl = "https://platinx.exchange/api/futureDepositFromMainWallet";

    const futuresHeaders = {
      "Content-Type": "application/json",
      "client-secret": process.env.PLATINX_CLIENT_SECRET,
    };

    const futuresBody = {
      user_id: Number(user),
      amount: Number(amount),
    };

    const futuresRes = await axios.post(
      futuresUrl,
      futuresBody,
      {
        headers: futuresHeaders,
      }
    );

    // const futuresRes = { data: { success: true } };

    console.log(
      "✅ Futures wallet debited successfully:",
      futuresRes.data
    );

    // ❌ Stop execution if API says success = false
    if (!futuresRes.data?.success) {
      return next(
        new AppError(
          futuresRes.data?.msg ||
            "Failed to debit amount from futures wallet",
          400
        )
      );
    }

  } catch (futureErr) {
    console.error("❌ Futures Wallet API Error:", futureErr?.response?.data || futureErr.message);

    return next(
      new AppError(
        futureErr?.response?.data?.msg || "Failed to process futures wallet deduction",
        futureErr?.response?.status || 500
      )
    );
  }

  /**
   * =========================================
   * STEP 2: Deposit INR to PI42
   * =========================================
   */

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
        err?.response?.data?.message || "PI42 deposit failed", err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Failed to deposit INR", 500));
  }

  /**
   * =========================================
   * STEP 3: Save transaction in DB
   * =========================================
   */

  try {
    await createDepositTransaction(
      id,
      response,
      Number(amount),
      referenceId
    );
  } catch (saveErr) {
    console.error(
      "❌ Failed to save deposit transaction to DB:",
      saveErr
    );

    // Deposit already succeeded on PI42
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


// exports.withdrawINR = catchAsync(async (req, res, next) => {
//   const { amount } = req.body;

//   // ✅ Everything comes from middleware now
//   const { id, userId, accountId } = req.pi42Account;

//   if (!amount) {
//     return next(new AppError("amount is required", 400));
//   }

//   if (Number(amount) <= 0) {
//     return next(new AppError("Amount must be greater than 0", 400));
//   }

//   const endpoint = `/v1/integration/withdraw-inr`;
//   const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

//   // 🔹 headers
//   const headers = buildHeaders(
//     process.env.PARTNER_NAME,
//     process.env.API_COOKIE,
//     userId,
//     accountId
//   );

//   // 🔥 referenceId (VERY IMPORTANT)
//   const referenceId = generateReferenceIdForWithdrawl();

//   // 🔹 body
//   const body = {
//     amount: Number(amount),
//     referenceId,
//   };

//   let response;

//   try {
//     const apiRes = await axios.post(url, body, { headers });
//     response = apiRes.data;
//   } catch (err) {
//     console.error("❌ PI42 Withdraw Error:", err?.response?.data || err.message);

//     return next(
//       new AppError(
//         err?.response?.data?.message || "PI42 withdraw failed",
//         err?.response?.status || 500
//       )
//     );
//   }

//   if (!response) {
//     return next(new AppError("Failed to withdraw INR", 500));
//   }

//   try {
//     await createWithdrawalTransaction(
//       id,           // pi42Account
//       response,
//       Number(amount),         // requested amount
//       referenceId
//     );
//   } catch (saveErr) {
//     console.error("❌ Failed to save withdrawal transaction to DB:", saveErr);
//     // We still return success because withdrawal request succeeded on Pi42 side
//   }

//   res.status(200).json({
//     status: true,
//     message: "INR withdrawn successfully",
//     data: {
//       referenceId,
//       ...response,
//     },
//   });
// });



exports.withdrawINR = catchAsync(async (req, res, next) => {
  const { user, amount } = req.body;

  // ✅ Everything comes from middleware now
  const { id, userId, accountId } = req.pi42Account;

  if (!amount) {
    return next(new AppError("amount is required", 400));
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

  try {
    await createWithdrawalTransaction(
      id, // pi42Account
      response,
      Number(amount),
      referenceId
    );
  } catch (saveErr) {
    console.error("❌ Failed to save withdrawal transaction to DB:", saveErr);
    // We still return success because withdrawal request succeeded on Pi42 side
  }

   try {
    const futuresUrl = `https://platinx.exchange/api/futureWithdrawToMainWallet`;

    const futuresHeaders = {
      "Content-Type": "application/json",
      "client-secret": process.env.PLATINX_CLIENT_SECRET,
    };

    const futuresBody = {
      user_id: Number(user), // convert string → number
      amount: Number(amount),
    };

    const futuresRes = await axios.post(futuresUrl, futuresBody, {headers: futuresHeaders});

    console.log("✅ Futures wallet updated successfully:", futuresRes.data);

  } catch (futureErr) {
    console.error(
      "❌ Futures Wallet API Error:",
      futureErr?.response?.data || futureErr.message
    );

    // OPTIONAL:
    // You can decide whether to fail request or not.
    // Currently keeping withdrawal successful because PI42 succeeded.
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
    page = 1,
    pageSize = 100,
    type,
    from,
    to,
    marginAsset = "INR",
  } = req.body;

  const { userId, accountId } = req.pi42Account;

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

  // ✅ Reverse the data array (newest first) - assuming API returns oldest first
  if (response?.data && Array.isArray(response?.data)) {
    response.data.reverse();
  }

  res.status(200).json({
    status: true,
    message: "Deposit/Withdraw history fetched successfully",
    data: response,
  });
});


exports.getFuturesWalletDetails = catchAsync(async (req, res, next) => {
  const { marginAsset = "INR" } = req.query;

  const { userId, accountId } = req.pi42Account;

  if (!userId || !accountId) {
    return next(new AppError("userId and accountId are required", 400));
  }

  if (!["INR", "USDT"].includes(marginAsset)) {
    return next(
      new AppError("marginAsset must be INR or USDT", 400)
    );
  }

  const userData = await getPi42User(userId, accountId);

  if (!userData) {
    return next(new AppError("Pi42 user not found", 404));
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
  const params = { marginAsset };

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

  try {
    await upsertFuturesWallet(userData._id, response);
  } catch (saveErr) {
    console.error("❌ Failed to create wallet record in DB:", saveErr);
    // Still return success because data was fetched successfully from Pi42
  }

  res.status(200).json({
    status: true,
    message: "Wallet details fetched successfully",
    data: response,
  });
});


exports.getDepositWithdrawHistoryFromDB = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    type, // WITHDRAWAL, DEPOSIT
    from,
    to,
    marginAsset = "INR",
  } = req.body;

  const { id } = req.pi42Account;   // Assuming this gives you the account

  if (Number(page) < 1) {
    return next(new AppError("page must be >= 1", 400));
  }

  const filter = {
    pi42Account: id,
    isDeleted: false,
  };

  // Filter by type (DEPOSIT / WITHDRAWAL)
  if (type) {
    filter.type = type.toUpperCase();
  }

  // Filter by asset
  if (marginAsset) {
    filter.asset = marginAsset.toUpperCase();
  }

  // Date range filter
  if (from || to) {
    filter.pi42TransactionTime = {};
    if (from) filter.pi42TransactionTime.$gte = new Date(from);
    if (to) filter.pi42TransactionTime.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);

  // Fetch from MongoDB - sorted by newest first (descending)
  const transactions = await Pi42WalletTransaction.find(filter)
    .sort({ pi42TransactionTime: -1 })     // Newest first
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const totalCount = await Pi42WalletTransaction.countDocuments(filter);

  // Format response according to UI
  const formattedData = transactions.map(tx => ({
    type: tx.type,
    amount: tx.type === "DEPOSIT" 
      ? `+${tx.amountCredited || tx.amount}` 
      : `-${tx.amountDebited || tx.amount}`,
    status: tx.paymentStatus || "SUCCESS",
    date: tx.pi42TransactionTime 
      ? moment(tx.pi42TransactionTime)
          .tz('Asia/Kolkata')
          .format('DD MMM YYYY, hh:mm a')
      : '',
    // Extra useful fields (you can hide in UI if not needed)
    referenceId: tx.referenceId,
    orderId: tx.transactionId,
    asset: tx.asset,
  }));

  res.status(200).json({
    status: true,
    message: "Deposit/Withdraw history fetched successfully",
    data: {
      data: formattedData,
      totalCount,
      page: Number(page),
      limit: Number(limit),
      hasMore: skip + formattedData.length < totalCount,
    }
  });
});