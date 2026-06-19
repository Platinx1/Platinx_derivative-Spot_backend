const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParamsDMA } = require("../../../utils/urlAndParamsHelper");
const SubAccount = require("../../../models/subAccountSchema");


const DMA_ENDPOINTS = {
  CREATE_SUBACCOUNT: "/dma/api/v1/master/subaccount/create",
  LIST_SUBACCOUNTS: "/dma/api/v1/master/subaccounts",
  DISABLE_SUBACCOUNT: "/dma/api/v1/master/subaccount/disable",
};

const handleApiResponse = (res, message, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};


exports.registerPlatinxUserForSpot = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  // 🔹 Validate input
  if (!userId) {
    return next(new AppError("userId is required", 400));
  }

  try {
    // 🔹 Check if user already has a MAIN spot account
    const existingAccount = await SubAccount.findOne({userId: String(userId).trim()}).lean();

    if (existingAccount) {
      return res.status(200).json({
        status: true,
        message: "User already registered for spot trading",
        data: existingAccount,
      });
    }

    // 🔹 Create new spot account
    const newSpotAccount = new SubAccount({
      userId: String(userId).trim(),
    });

    // ✅ Save document
    await newSpotAccount.save({ validateBeforeSave: false });

    return res.status(201).json({
      status: true,
      message: "User registered for spot trading successfully",
      data: newSpotAccount,
    });

  } catch (err) {
    console.error("❌ DB Error:", err.message);

    return next(
      new AppError("Failed to register user for spot trading", 500)
    );
  }
});


// exports.createSubAccount = catchAsync(async (req, res, next) => {
//   const { userId } = req.body;

//   // ✅ Validate required platform fields
//   if (!userId) {
//     return next(new AppError("userId is required", 400));
//   }

//   const method = "POST";
//   const path = DMA_ENDPOINTS.CREATE_SUBACCOUNT;
//   const queryObj = {};

//   const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

//   // ✅ Use master API key + seconds epoch (DMA B2B API requirement)
//   const headers = getAuthHeaders(
//     method,
//     path,
//     queryObj,
//     null,                     // No body for this endpoint
//     process.env.API_KEY,     // Master key — NOT subaccount key
//     process.env.API_SECRET, // Master secret
//     "s"                    // ✅ Seconds epoch for DMA API
//   );

//   console.log("Creating subaccount for userId:", userId);
//   console.log("Request URL:", fullUrl);

//   let coinswitchResponse;

//   try {
//     const response = await axios({
//       method,
//       url: fullUrl,
//       headers,
//       // No data/body — CoinSwitch docs say Request Body: None
//     });

//     coinswitchResponse = response.data;
//   } catch (error) {
//     if (error.response) {
//       const { status, data } = error.response;

//       if (status === 401) {
//         return next(
//           new AppError(
//             data.message || "Invalid or missing master API credentials",
//             401
//           )
//         );
//       }
//       if (status === 403) {
//         return next(
//           new AppError(
//             data.message ||
//               "Forbidden — ensure you are using master account API key, not subaccount key",
//             403
//           )
//         );
//       }
//       if (status === 500) {
//         return next(
//           new AppError("CoinSwitch internal server error — please retry", 500)
//         );
//       }

//       return next(
//         new AppError(
//           `CoinSwitch error: ${data.message || "Unknown error"}`,
//           status
//         )
//       );
//     }

//     return next(new AppError("Failed to connect to CoinSwitch DMA API", 503));
//   }

//   // ✅ CoinSwitch returned: api_key, api_secret, subaccount_id
//   const { api_key, api_secret, subaccount_id } = coinswitchResponse.data;

//   if (!api_key || !api_secret || !subaccount_id) {
//     return next(
//       new AppError(
//         "CoinSwitch returned incomplete subaccount data — contact support",
//         500
//       )
//     );
//   }

//   // ✅ Save to DB
//   // ⚠️  In production: encrypt api_secret before saving
//   let subAccount;
//   try {
//     subAccount = await SubAccount.create({
//       userId,
//       name: "Main Account",
//       type: "MAIN",
//       exchange: "COINSWITCH",
//       exchangeSubAccountId: subaccount_id.toString(), // store int64 as string
//       apiKey: api_key,
//       apiSecret: api_secret, // TODO: encrypt before storing
//       status: "ACTIVE",
//       isActive: true,
//     });
//   } catch (dbError) {
//     // If DB save fails, log it — the subaccount exists on CoinSwitch side
//     // You should handle reconciliation (e.g., store raw response somewhere)
//     console.error(
//       "CRITICAL: Subaccount created on CoinSwitch but DB save failed:",
//       {
//         subaccount_id,
//         api_key,
//         userId,
//         error: dbError.message,
//       }
//     );
//     return next(
//       new AppError(
//         "Subaccount created on CoinSwitch but failed to save locally. Contact support with userId: " +
//           userId,
//         500
//       )
//     );
//   }

//   handleApiResponse(res, "Subaccount created successfully", {
//     subAccountId: subAccount._id,
//     exchangeSubAccountId: subAccount.exchangeSubAccountId,
//     name: subAccount.name,
//     type: subAccount.type,
//     status: subAccount.status,
//   });
// });


exports.createSubAccount = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  // ✅ Validate required platform fields
  if (!userId) {
    return next(new AppError("userId is required", 400));
  }

  // ✅ Check if local document already exists
  const existingSubAccount = await SubAccount.findOne({
    userId: String(userId).trim(),
    type: "MAIN",
  });

  if (!existingSubAccount) {
    return next(
      new AppError(
        "User is not registered for spot trading. Please register first.",
        404
      )
    );
  }

  const method = "POST";
  const path = DMA_ENDPOINTS.CREATE_SUBACCOUNT;
  const queryObj = {};

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  // ✅ Use master API key + seconds epoch (DMA B2B API requirement)
  const headers = getAuthHeaders(
    method,
    path,
    queryObj,
    null,                     // No body for this endpoint
    process.env.API_KEY,     // Master key — NOT subaccount key
    process.env.API_SECRET, // Master secret
    "s"                    // ✅ Seconds epoch for DMA API
  );

  console.log("Creating subaccount for userId:", userId);
  console.log("Request URL:", fullUrl);

  let coinswitchResponse;

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      // No data/body — CoinSwitch docs say Request Body: None
    });

    coinswitchResponse = response.data;
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        return next(
          new AppError(
            data.message || "Invalid or missing master API credentials",
            401
          )
        );
      }
      if (status === 403) {
        return next(
          new AppError(
            data.message ||
              "Forbidden — ensure you are using master account API key, not subaccount key",
            403
          )
        );
      }
      if (status === 500) {
        return next(
          new AppError("CoinSwitch internal server error — please retry", 500)
        );
      }

      return next(
        new AppError(
          `CoinSwitch error: ${data.message || "Unknown error"}`,
          status
        )
      );
    }

    return next(new AppError("Failed to connect to CoinSwitch DMA API", 503));
  }

  // ✅ CoinSwitch returned: api_key, api_secret, subaccount_id
  const { api_key, api_secret, subaccount_id } = coinswitchResponse.data;

  if (!api_key || !api_secret || !subaccount_id) {
    return next(
      new AppError(
        "CoinSwitch returned incomplete subaccount data — contact support",
        500
      )
    );
  }

  // ✅ UPDATE existing document
  let updatedSubAccount;

  try {
    updatedSubAccount = await SubAccount.findOneAndUpdate(
      {userId: String(userId).trim()},
      {
        $set: {
          exchangeSubAccountId: subaccount_id.toString(),
          apiKey: api_key,
          apiSecret: api_secret, // TODO: encrypt in production
          status: "ACTIVE",
          isActive: true,
        },
      },
      {
        new: true,
        runValidators: false,
      }
    );

  } catch (dbError) {
    console.error(
      "CRITICAL: Subaccount created on CoinSwitch but DB update failed:",
      {
        subaccount_id,
        api_key,
        userId,
        error: dbError.message,
      }
    );

    return next(
      new AppError(
        "Subaccount created on CoinSwitch but failed to update locally.",
        500
      )
    );
  }

  handleApiResponse(res, "Subaccount created successfully", {
    // subAccountId: updatedSubAccount._id,
    exchangeSubAccountId: updatedSubAccount.exchangeSubAccountId,
    name: updatedSubAccount.name,
    type: updatedSubAccount.type,
    status: updatedSubAccount.status,
  });
});


exports.listSubAccounts = catchAsync(async (req, res, next) => {
  const method = "GET";
  const path = DMA_ENDPOINTS.LIST_SUBACCOUNTS;
  const queryObj = {};

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(
    method,
    path,
    queryObj,
    null,
    process.env.API_KEY,
    process.env.API_SECRET,
    "s" // seconds
  );

  try {
    const response = await axios({ method, url: fullUrl, headers });
    handleApiResponse(res, "Subaccounts fetched successfully", response.data);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      return next(
        new AppError(`CoinSwitch error: ${data.message || "Unknown"}`, status)
      );
    }
    return next(new AppError("Failed to connect to CoinSwitch DMA API", 503));
  }
});


exports.disableSubAccount = catchAsync(async (req, res, next) => {
  const { subaccount_id } = req.body;

  if (!subaccount_id) {
    return next(new AppError("subaccount_id is required", 400));
  }

  // Validate it's a numeric string as per doc
  if (isNaN(Number(subaccount_id))) {
    return next(
      new AppError(
        "subaccount_id must be a valid numeric identifier",
        400
      )
    );
  }

  // ✅ Check in our DB first — prevent double-disable (doc returns 400 if already disabled)
  const subAccount = await SubAccount.findOne({
    exchangeSubAccountId: subaccount_id.toString(),
  });

  if (!subAccount) {
    return next(
      new AppError(
        `Subaccount not found locally for subaccount_id: ${subaccount_id}`,
        404
      )
    );
  }

  if (subAccount.status === "SUSPENDED") {
    return next(
      new AppError(
        "Subaccount is already disabled. CoinSwitch does not allow re-enabling.",
        400
      )
    );
  }

  const method = "PUT";
  const path = DMA_ENDPOINTS.DISABLE_SUBACCOUNT;
  const queryObj = {};
  const body = { subaccount_id: subaccount_id.toString() };

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  // Auth: Master API key + seconds epoch
  const headers = getAuthHeaders(
    method,
    path,
    queryObj,
    null,                          // Body not included in signature for DMA APIs
    process.env.MASTER_API_KEY,
    process.env.MASTER_API_SECRET,
    "s"                            // Seconds epoch
  );

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      data: body,
    });

    // ✅ Sync status in our DB
    await SubAccount.findOneAndUpdate(
      { exchangeSubAccountId: subaccount_id.toString() },
      {
        status: "SUSPENDED",
        isActive: false,
      }
    );

    handleApiResponse(res, "Subaccount disabled successfully", {
      exchangeSubAccountId: subaccount_id.toString(),
      status: "SUSPENDED",
      note: "Subaccount cannot be re-enabled. TRANSFER_OUT is still allowed to withdraw remaining funds.",
      coinswitch: response.data,
    });
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      // Doc-defined error codes for this endpoint
      if (status === 400) {
        // Could be: "subaccount is already disabled" or "invalid subaccount_id"
        return next(
          new AppError(
            data.message || "Bad request — subaccount may already be disabled",
            400
          )
        );
      }
      if (status === 403) {
        return next(
          new AppError(
            data.message ||
              "Forbidden — subaccount does not belong to your master account",
            403
          )
        );
      }
      if (status === 404) {
        return next(
          new AppError(
            data.message ||
              `Subaccount not found on CoinSwitch for id: ${subaccount_id}`,
            404
          )
        );
      }
      if (status === 401) {
        return next(
          new AppError(
            data.message || "Invalid or missing master API credentials",
            401
          )
        );
      }

      return next(
        new AppError(
          `CoinSwitch error: ${data.message || "Unknown error"}`,
          status
        )
      );
    }

    return next(new AppError("Failed to connect to CoinSwitch DMA API", 503));
  }
});