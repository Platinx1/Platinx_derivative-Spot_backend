const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParamsDMA } = require("../../../utils/urlAndParamsHelper");


const DMA_ENDPOINTS = {
  MASTER_BALANCE: "/dma/api/v1/master/balance",
  SUBACCOUNT_BALANCE: "/dma/api/v1/master/subaccount/balance",
  CONSOLIDATED_BALANCE: "/dma/api/v1/master/balance/consolidated",
};

const handleApiResponse = (res, message, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};


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
      response.data.data
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


exports.getSubAccountBalance = catchAsync(async (req, res, next) => {
  const { subaccount_id } = req.query;

  console.log("Fetching balance for subaccount_id:", subaccount_id);

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
    process.env.API_KEY,
    process.env.API_SECRET,
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
    process.env.API_KEY,
    process.env.API_SECRET,
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