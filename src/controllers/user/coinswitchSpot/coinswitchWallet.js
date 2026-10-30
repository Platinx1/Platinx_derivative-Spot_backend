const mongoose = require("mongoose");
const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const CoinswitchWallet = require("../../../models/coinswitchModels/coinswitchWallet");
const CoinswitchWalletTransaction = require("../../../models/coinswitchModels/coinswitchWalletTransaction");

// exports.depositINRForSpot = catchAsync(async (req, res, next) => {
//   const { user, amount } = req.body;

//   if (!amount || Number(amount) <= 0) {
//     return next(new AppError("Valid amount is required", 400));
//   }

//   const depositAmount = Number(amount);

//   const { id: coinswitchAccountId } = req.coinswitchAccount;

//   /**
//    * STEP 1: Deduct from Futures Wallet (Existing Logic)
//    */
//   const futuresUrl = "https://platinx.exchange/api/futureDepositFromMainWallet";

//   const futuresHeaders = {
//     "Content-Type": "application/json",
//     "client-secret": process.env.PLATINX_CLIENT_SECRET,
//   };

//   const futuresBody = {
//     user_id: Number(user),
//     amount: depositAmount,
//   };

//   const futuresRes = await axios.post(futuresUrl, futuresBody, { headers: futuresHeaders });

//   if (!futuresRes.data?.success) {
//     return next(new AppError(
//       futuresRes.data?.msg || "Failed to debit from futures wallet",
//       400
//     ));
//   }

//   /**
//    * STEP 2: Update/Create Coinswitch Spot Wallet
//    */
//   let wallet = await CoinswitchWallet.findOne({
//     coinswitchAccount: coinswitchAccountId,
//     asset: "INR"
//   });

//   if (!wallet) {
//     // Create new wallet document
//     wallet = await CoinswitchWallet.create({
//       coinswitchAccount: coinswitchAccountId,
//       asset: "INR",
//       totalBalance: depositAmount,
//       freeBalance: depositAmount,
//       lockedBalance: 0,
//       availableForSpot: depositAmount,
//     });
//   } else {
//     // Update existing wallet
//     wallet.totalBalance = (Number(wallet.totalBalance) || 0) + depositAmount;
//     wallet.freeBalance = (Number(wallet.freeBalance) || 0) + depositAmount;
//     wallet.availableForSpot = (Number(wallet.availableForSpot) || 0) + depositAmount;

//     await wallet.save();
//   }

//   /**
//    * Create Transaction Record
//    */
//   await CoinswitchWalletTransaction.create({
//     coinswitchAccount: coinswitchAccountId,
//     type: "DEPOSIT",
//     status: "SUCCESS",
//     amount: depositAmount,
//     asset: "INR",
//     coinswitchTransactionTime: new Date(),
//   });

//   return res.status(200).json({
//     status: true,
//     message: "INR deposited successfully to Spot Wallet",
//     data: {
//       walletBalance: {
//         total: wallet.totalBalance,
//         free: wallet.freeBalance,
//       }
//     }
//   });
// });

exports.depositINRForSpot = catchAsync(async (req, res, next) => {
  const { user, amount } = req.body;

  if (!amount || Number(amount) <= 0) {
    return next(new AppError("Valid amount is required", 400));
  }

  const depositAmount = Number(amount);

  const { id: coinswitchAccountId } = req.coinswitchAccount;

  /**
   * STEP 1: Deduct from Futures Wallet
   */
  // const futuresUrl = "https://platinx.exchange/api/futureDepositFromMainWallet";
  const futuresUrl = `${process.env.MAIN_WALLET_BASE_URL}/spotDepositFromMainWallet`;

  const futuresHeaders = {
    "Content-Type": "application/json",
    "client-secret": process.env.PLATINX_CLIENT_SECRET,
  };

  const futuresBody = {
    user_id: Number(user),
    amount: depositAmount,
  };

  let futuresRes;

  try {
    futuresRes = await axios.post(futuresUrl, futuresBody, {
      headers: futuresHeaders,
    });
  } catch (err) {
    console.error(
      "❌ Futures Wallet API Error:",
      err?.response?.data || err.message,
    );

    return next(
      new AppError(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          "Failed to debit from futures wallet",
        err?.response?.status || 500,
      ),
    );
  }

  if (!futuresRes.data?.success) {
    return next(
      new AppError(
        futuresRes.data?.msg || "Failed to debit from futures wallet",
        400,
      ),
    );
  }

  /**
   * STEP 2: Wallet + Transaction (Atomic)
   */
  const session = await mongoose.startSession();

  let wallet;

  try {
    session.startTransaction();

    wallet = await CoinswitchWallet.findOne({
      coinswitchAccount: coinswitchAccountId,
    }).session(session);

    if (!wallet) {
      const wallets = await CoinswitchWallet.create(
        [
          {
            coinswitchAccount: coinswitchAccountId,
            totalBalance: depositAmount,
            freeBalance: depositAmount,
            lockedBalance: 0,
            availableForSpot: depositAmount,
          },
        ],
        { session },
      );

      wallet = wallets[0];
    } else {
      wallet.totalBalance = Number(wallet.totalBalance) + Number(depositAmount);
      wallet.freeBalance = Number(wallet.freeBalance) + Number(depositAmount);
      wallet.availableForSpot =
        Number(wallet.availableForSpot) + Number(depositAmount);

      await wallet.save({ session });
    }

    await CoinswitchWalletTransaction.create(
      [
        {
          coinswitchAccount: coinswitchAccountId,
          type: "DEPOSIT",
          status: "SUCCESS",
          amount: depositAmount,
          asset: "INR",
          coinswitchTransactionTime: new Date(),
        },
      ],
      { session },
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ MongoDB Transaction Error:", err);
    return next(new AppError("Failed to update Spot Wallet", 500));
  } finally {
    session.endSession();
  }

  return res.status(200).json({
    status: true,
    message: "INR deposited successfully to Spot Wallet",
    data: wallet,
  });
});

exports.withdrawINRFromSpot = catchAsync(async (req, res, next) => {
  const { user, amount } = req.body;

  const { id: coinswitchAccountId } = req.coinswitchAccount;

  if (!amount) {
    return next(new AppError("amount is required", 400));
  }

  const withdrawAmount = Number(amount);

  if (withdrawAmount <= 0) {
    return next(new AppError("Amount must be greater than 0", 400));
  }

  /**
   * STEP 1: Check Spot Wallet Balance
   */
  const wallet = await CoinswitchWallet.findOne({
    coinswitchAccount: coinswitchAccountId,
  });

  if (!wallet) {
    return next(new AppError("Spot wallet not found", 404));
  }

  if ((wallet.freeBalance || 0) < withdrawAmount) {
    return next(new AppError("Insufficient balance", 400));
  }

  /**
   * STEP 2: Credit Futures Wallet
   */
  // const futuresUrl = "https://platinx.exchange/api/futureWithdrawToMainWallet";
  const futuresUrl = `${process.env.MAIN_WALLET_BASE_URL}/spotWithdrawToMainWallet`;

  const futuresHeaders = {
    "Content-Type": "application/json",
    "client-secret": process.env.PLATINX_CLIENT_SECRET,
  };

  const futuresBody = {
    user_id: Number(user),
    amount: withdrawAmount,
  };

  let futuresResponse;

  try {
    const apiRes = await axios.post(futuresUrl, futuresBody, {
      headers: futuresHeaders,
    });

    futuresResponse = apiRes.data;
  } catch (futureErr) {
    console.error(
      "❌ Futures Wallet API Error:",
      futureErr?.response?.data || futureErr.message,
    );

    return next(
      new AppError(
        futureErr?.response?.data?.msg ||
          futureErr?.response?.data?.message ||
          "Failed to transfer funds to Futures Wallet",
        futureErr?.response?.status || 500,
      ),
    );
  }

  if (!futuresResponse?.success) {
    return next(
      new AppError(
        futuresResponse?.msg || "Failed to transfer funds to Futures Wallet",
        400,
      ),
    );
  }

  /**
   * STEP 3: Update Wallet & Transaction (Atomic)
   */
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    wallet.totalBalance = Number(wallet.totalBalance) - Number(withdrawAmount);
    wallet.freeBalance = Number(wallet.freeBalance) - Number(withdrawAmount);
    wallet.availableForSpot =
      Number(wallet.availableForSpot) - Number(withdrawAmount);

    await wallet.save({ session });

    await CoinswitchWalletTransaction.create(
      [
        {
          coinswitchAccount: coinswitchAccountId,
          type: "WITHDRAWAL",
          status: "SUCCESS",
          amount: withdrawAmount,
          asset: "INR",
          coinswitchTransactionTime: new Date(),
        },
      ],
      { session },
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();

    console.error("❌ Mongo Transaction Failed:", err);

    return next(
      new AppError(
        "Amount transferred to Futures Wallet but failed to update Spot Wallet. Please contact support.",
        500,
      ),
    );
  } finally {
    session.endSession();
  }

  return res.status(200).json({
    status: true,
    message: "INR withdrawn successfully from Spot Wallet",
    data: wallet,
  });
});

exports.getTransactionHistory = catchAsync(async (req, res, next) => {
  const { id: coinswitchAccountId } = req.coinswitchAccount;

  const { type, status, limit = 30, page = 1 } = req.query;

  const query = { coinswitchAccount: coinswitchAccountId };

  if (type) query.type = type.toUpperCase(); // DEPOSIT, WITHDRAWAL
  if (status) query.status = status.toUpperCase();

  const skip = (page - 1) * Number(limit);

  const transactions = await CoinswitchWalletTransaction.find(query)
    .sort({ coinswitchTransactionTime: -1 }) // latest first
    .skip(skip)
    .limit(Number(limit));

  const total = await CoinswitchWalletTransaction.countDocuments(query);

  res.status(200).json({
    status: true,
    message: "Transaction history fetched successfully",
    currentPage: Number(page),
    totalPages: Math.ceil(total / limit),
    data: transactions,
  });
});

exports.getWalletBalance = catchAsync(async (req, res, next) => {
  const { id: coinswitchAccountId } = req.coinswitchAccount;

  const wallet = await CoinswitchWallet.findOne({
    coinswitchAccount: coinswitchAccountId,
  });

  if (!wallet) {
    return res.status(200).json({
      status: true,
      message: "Wallet balance fetched successfully",
      data: null,
    });
  }

  const data = wallet.toObject();

  data.totalBalance = Number(data.totalBalance).toFixed(2);
  data.freeBalance = Number(data.freeBalance).toFixed(2);
  data.lockedBalance = Number(data.lockedBalance).toFixed(2);
  data.availableForSpot = Number(data.availableForSpot).toFixed(2);

  res.status(200).json({
    status: true,
    message: "Wallet balance fetched successfully",
    data,
  });
});
