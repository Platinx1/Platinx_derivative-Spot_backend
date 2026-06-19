const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParamsDMA } = require("../../../utils/urlAndParamsHelper");
const SubAccount = require("../../../models/SubAccount"); // your mongoose model

const DMA_ENDPOINTS = {
  CREATE_SUBACCOUNT: "/dma/api/v1/master/subaccount/create",
  LIST_SUBACCOUNTS: "/dma/api/v1/master/subaccounts",
  DISABLE_SUBACCOUNT: "/dma/api/v1/master/subaccount/disable",
  MASTER_BALANCE: "/dma/api/v1/master/balance",
  SUBACCOUNT_BALANCE: "/dma/api/v1/master/subaccount/balance",
  CONSOLIDATED_BALANCE: "/dma/api/v1/master/balance/consolidated",
  MASTER_TRANSFER: "/dma/api/v1/master/transfer",
};

// ─── Helper ────────────────────────────────────────────────────────────────

const handleApiResponse = (res, message, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// ─── Create Subaccount ─────────────────────────────────────────────────────

/**
 * POST /dma/api/v1/master/subaccount/create
 * No request body needed — CoinSwitch creates and returns credentials
 * Uses MASTER API key + seconds epoch
 */
exports.createSubAccount = catchAsync(async (req, res, next) => {
  const { userId, name, type } = req.body;

  // ✅ Validate required platform fields
  if (!userId) {
    return next(new AppError("userId is required", 400));
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
    null,                          // No body for this endpoint
    process.env.MASTER_API_KEY,    // Master key — NOT subaccount key
    process.env.MASTER_API_SECRET, // Master secret
    "s"                            // ✅ Seconds epoch for DMA API
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

  // ✅ Save to DB
  // ⚠️  In production: encrypt api_secret before saving
  let subAccount;
  try {
    subAccount = await SubAccount.create({
      userId,
      name: name || "Main Account",
      type: type || "MAIN",
      exchange: "COINSWITCH",
      exchangeSubAccountId: subaccount_id.toString(), // store int64 as string
      apiKey: api_key,
      apiSecret: api_secret, // TODO: encrypt before storing
      status: "ACTIVE",
      isActive: true,
    });
  } catch (dbError) {
    // If DB save fails, log it — the subaccount exists on CoinSwitch side
    // You should handle reconciliation (e.g., store raw response somewhere)
    console.error(
      "CRITICAL: Subaccount created on CoinSwitch but DB save failed:",
      {
        subaccount_id,
        api_key,
        userId,
        error: dbError.message,
      }
    );
    return next(
      new AppError(
        "Subaccount created on CoinSwitch but failed to save locally. Contact support with userId: " +
          userId,
        500
      )
    );
  }

  handleApiResponse(res, "Subaccount created successfully", {
    subAccountId: subAccount._id,
    exchangeSubAccountId: subAccount.exchangeSubAccountId,
    name: subAccount.name,
    type: subAccount.type,
    status: subAccount.status,
    // ⚠️  Never return apiKey or apiSecret to frontend
  });
});

// ─── List Subaccounts ──────────────────────────────────────────────────────

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
    process.env.MASTER_API_KEY,
    process.env.MASTER_API_SECRET,
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

// ─── Get Master Balance ────────────────────────────────────────────────────

exports.getMasterBalance = catchAsync(async (req, res, next) => {
  const method = "GET";
  const path = DMA_ENDPOINTS.MASTER_BALANCE;
  const queryObj = {};

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(
    method,
    path,
    queryObj,
    null,
    process.env.MASTER_API_KEY,
    process.env.MASTER_API_SECRET,
    "s"
  );

  try {
    const response = await axios({ method, url: fullUrl, headers });
    handleApiResponse(
      res,
      "Master balance fetched successfully",
      response.data
    );
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

// ─── Get Subaccount Balance ────────────────────────────────────────────────

exports.getSubAccountBalance = catchAsync(async (req, res, next) => {
  const { subaccount_id } = req.params;

  if (!subaccount_id) {
    return next(new AppError("subaccount_id is required", 400));
  }

  const method = "GET";
  const path = DMA_ENDPOINTS.SUBACCOUNT_BALANCE;
  const queryObj = { subaccount_id };

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(
    method,
    path,
    queryObj,
    null,
    process.env.MASTER_API_KEY,
    process.env.MASTER_API_SECRET,
    "s"
  );

  try {
    const response = await axios({ method, url: fullUrl, headers });
    handleApiResponse(
      res,
      "Subaccount balance fetched successfully",
      response.data
    );
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

// ─── Get Consolidated Balance ──────────────────────────────────────────────

exports.getConsolidatedBalance = catchAsync(async (req, res, next) => {
  const method = "GET";
  const path = DMA_ENDPOINTS.CONSOLIDATED_BALANCE;
  const queryObj = {};

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(
    method,
    path,
    queryObj,
    null,
    process.env.MASTER_API_KEY,
    process.env.MASTER_API_SECRET,
    "s"
  );

  try {
    const response = await axios({ method, url: fullUrl, headers });
    handleApiResponse(
      res,
      "Consolidated balance fetched successfully",
      response.data
    );
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