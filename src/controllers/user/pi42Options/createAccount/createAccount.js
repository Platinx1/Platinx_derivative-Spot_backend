const axios = require('axios');
const catchAsync = require('./../../../../utils/catchAsync');
const AppError = require('./../../../../utils/AppError');
const buildHeaders = require('./../../../../utils/buildHeaders');
const Pi42Account = require('./../../../../models/pi42Models/pi42Account');


exports.createPi42UsersOptionsAccount = catchAsync(async (req, res, next) => {
  const { user } = req.body;

  // console.log(":::::::::::::::::::::::::::::::::::", user);

  const { userId, accountId } = req.pi42Account;

  if (!user) {
    return next(new AppError("User ID (id) is required in request body", 400));
  }

  const endpoint = `/v1/user/create-options-account`;
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  // console.log(":::::::::::::::::::::::::::::::::::", url);

  // Headers (as per your existing authenticated pattern)
  const headers = buildHeaders(process.env.PARTNER_NAME, process.env.API_COOKIE, userId, accountId);

  // console.log(">>>>>>>>>>>>>>>>>>>", headers);

  let response;

  try {
    const apiRes = await axios.post(url, {}, { headers }); // Empty body as per docs
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Create Options Account Error:", err?.response?.data || err.message);

    return next(
      new AppError(
        err?.response?.data?.message || 
        err?.response?.data?.error || 
        "Failed to create options account on PI42",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("No response received from PI42", 500));
  }

  await Pi42Account.findOneAndUpdate(
    { user },
    { isOptionsAccountCreated: true },
    { new: true, runValidators: false }
  );

  res.status(201).json({
    status: true,
    message: "Pi42 Options account created successfully",
    data: response,
  });
});