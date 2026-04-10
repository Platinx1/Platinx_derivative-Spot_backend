const crypto = require("crypto");
const axios = require("axios");


const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const buildHeaders = require("../../../utils/buildHeaders");
const { createPi42User } = require("../../../services/pi42UserService");

// 🔥 Unique refId generator
const generateRefId = () => {
  return `plx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};

const generateRandomNumber = () => {
  return (100000 + Math.floor(Math.random() * 900000)).toString(); // Generates a 6-digit string
};

exports.createPi42UserAccount = catchAsync(async (req, res, next) => {
  const refId = generateRefId();
  const randomUserId = generateRandomNumber(); // Generate a random user ID

  const endpoint = `/v1/integration/create-user`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // 🔹 headers
  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE);

  // 🔹 body
  const body = {
    refId,
  };

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

  await createPi42User(randomUserId, pi42UserId, pi42AccountId, refId);

  res.status(201).json({
    status: true,
    message: "User created successfully on PI42",
    data: {
      refId,
      ...response, // userId, accountId
    },
  });
});


exports.getPi42User = catchAsync(async (req, res, next) => {
  // const { refId } = req.body;
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