const crypto = require("crypto");
const axios = require("axios");


const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");
const { updatePi42User } = require("../../../services/pi42UserService");
const Pi42Account = require("../../../models/pi42Models/pi42Account");
const CoinSwitchSpotAccount = require("../../../models/coinswitchModels/coinSwitchSpotAccount");

// 🔥 Unique refId generator
const generateRefId = () => {
  return `plx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};



exports.registerPlatinxUser = catchAsync(async (req, res, next) => {
  const { user } = req.body;

  if (!user) {
    return next(new AppError("userId is required", 400));
  }

  try {
    const trimmedUserId = String(user).trim();

    // =========================================================
    // 🔹 CHECK EXISTING SPOT ACCOUNT
    // =========================================================
    let spotAccount = await CoinSwitchSpotAccount.findOne({
      user: trimmedUserId,
      isActive: true,
    }).lean();

    // =========================================================
    // 🔹 CHECK EXISTING FUTURES ACCOUNT
    // =========================================================
    let futuresAccount = await Pi42Account.findOne({
      user: trimmedUserId,
      isDeleted: false,
    }).lean();

    // =========================================================
    // 🔹 IF BOTH ACCOUNTS ALREADY EXIST
    // =========================================================
    if (spotAccount && futuresAccount) {
      return res.status(200).json({
        status: true,
        message:
          "User already registered for both spot and futures trading",
        data: {
          spotAccount,
          futuresAccount,
        },
      });
    }

    // =========================================================
    // 🔹 CREATE SPOT ACCOUNT IF NOT EXISTS
    // =========================================================
    if (!spotAccount) {
      const newSpotAccount = new CoinSwitchSpotAccount({
        user: trimmedUserId,
      });

      await newSpotAccount.save({ validateBeforeSave: false });

      spotAccount = newSpotAccount;
    }

    // =========================================================
    // 🔹 CREATE FUTURES ACCOUNT ON PI42 IF NOT EXISTS
    // =========================================================
    if (!futuresAccount) {
      // 🔹 Generate Reference ID
      const refId = generateRefId();

      // 🔹 API Config
      const endpoint = `/v1/integration/create-user`;
      const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

      // 🔹 Headers
      const headers = buildHeaders(
        process.env.PARTNER_NAME,
        process.env.API_COOKIE
      );

      // 🔹 Request Body
      const body = { refId };

      let response;

      try {
        const apiRes = await axios.post(url, body, { headers });

        response = apiRes.data;
      } catch (err) {
        console.error(
          "❌ PI42 Create User Error:",
          err?.response?.data || err.message
        );

        return next(
          new AppError(
            err?.response?.data?.message ||
              "PI42 create-user failed",
            err?.response?.status || 500
          )
        );
      }

      if (!response) {
        return next(
          new AppError("Failed to create user on PI42", 500)
        );
      }

      // =========================================================
      // 🔹 EXTRACT PI42 RESPONSE
      // =========================================================
      const { userId: pi42UserId, accountId: pi42AccountId } = response;

      // =========================================================
      // 🔹 CREATE PI42 ACCOUNT IN DB
      // =========================================================
      const newFuturesAccount = new Pi42Account({
        user: trimmedUserId,
        refId,
        pi42UserId,
        pi42AccountId,
        isActive: true,
        isDeleted: false,
      });

      await newFuturesAccount.save({ validateBeforeSave: false });

      futuresAccount = newFuturesAccount;
    }

    // =========================================================
    // 🔹 SUCCESS RESPONSE
    // =========================================================
    return res.status(201).json({
      status: true,
      message:
        "User registered successfully for spot and futures trading",
      data: {
        spotAccount,
        futuresAccount,
      },
    });
  } catch (err) {
    console.error("❌ DB Error:", err.message);

    return next(
      new AppError("Failed to register user", 500)
    );
  }
});


exports.createPi42UserAccount = catchAsync(async (req, res, next) => {
  const { id: platinxUserId } = req.query;

  const existingUser = await Pi42Account.findOne({ user: platinxUserId, isDeleted: false }).lean();

  if (!existingUser) {
    return next(new AppError("User must be registered for futures first", 400));
  }

  const refId = generateRefId();

  const endpoint = `/v1/integration/create-user`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE);

  // 🔹 body
  const body = { refId };

  let response;

  try {
    const apiRes = await axios.post(url, body, { headers });

    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Create User Error:", err?.response?.data || err.message);

    return next(
      new AppError(
        err?.response?.data?.message || "PI42 create-user failed",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Failed to create user on PI42", 500));
  }

  // 🔥 Extract values from Pi42 response
  const { userId: pi42UserId, accountId: pi42AccountId } = response;

  const updatedUser = await updatePi42User(platinxUserId, pi42UserId, pi42AccountId, refId);

  res.status(201).json({
    status: true,
    message: "User created successfully on PI42",
    data: updatedUser,
  });
});


exports.getPi42User = catchAsync(async (req, res, next) => {
  const { refId } = req.query;

  if (!refId) {
    return next(new AppError("refId is required", 400));
  }

  const endpoint = `/v1/integration/user`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers (no userId/accountId needed here)
  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE
  );

  let response;

  try {
    const apiRes = await axios.get(url, {
      headers,
      params: {
        refId, // 👈 query param
      },
    });

    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Get User Error:", err?.response?.data || err.message);

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch Pi42 user",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("User not found on Pi42", 404));
  }

  res.status(200).json({
    status: true,
    message: "Pi42 user fetched successfully",
    data: response,
  });
});


exports.getUserMeta = catchAsync(async (req, res, next) => {
  const { userId, accountId } = req.query;

  // 🔥 validations
  if (!userId || !accountId) {
    return next(
      new AppError("userId and accountId are required", 400)
    );
  }

  const endpoint = `/v1/exchange/userMeta`;
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
    });

    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 User Meta Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch user meta",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("User meta not found", 404));
  }

  res.status(200).json({
    status: true,
    message: "User meta fetched successfully",
    data: response,
  });
});


exports.getAccountByUser = catchAsync(async (req, res, next) => {
  const { user } = req.query;

  // 🔥 validation
  if (!user) {
    return next(new AppError("user is required", 400));
  }

  const accounts = await Pi42Account.find({
    user: user.trim(),
    isDeleted: false, // 🔥 ignore soft-deleted records
  });

  if (!accounts || accounts.length === 0) {
    return next(new AppError("No accounts found for this user", 404));
  }

  res.status(200).json({
    status: true,
    message: "Accounts fetched successfully",
    results: accounts.length,
    data: accounts,
  });
});