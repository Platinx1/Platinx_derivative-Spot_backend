const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper"); // your existing helper
const { buildUrlAndParams } = require("../../../utils/urlAndParamsHelper");

// You can keep this in the same ENDPOINTS object or create a separate one for futures
const ENDPOINTS = {
  FUTURES_WALLET_BALANCE: "/trade/api/v2/futures/wallet_balance",
};

exports.getFuturesWalletBalance = catchAsync(async (req, res, next) => {

  const method = "GET";
  const path = ENDPOINTS.FUTURES_WALLET_BALANCE;

  const queryObj = {};
  const { fullUrl } = buildUrlAndParams(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj, null);

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
    });

    // Basic response validation
    if (!response.data || typeof response.data !== "object") {
      return next(new AppError("Invalid response format from CoinSwitch API", 500));
    }

    const balanceData = response.data?.data || response.data;

    res.status(200).json({
      success: true,
      message: "Futures wallet balance retrieved successfully",
      data: balanceData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Forward axios error with more context
    const status = error.response?.status || 500;
    const apiMessage = error.response?.data?.message || error.message;

    return next(
      new AppError(
        `CoinSwitch API error: ${apiMessage || "Failed to fetch wallet balance"}`,
        status
      )
    );
  }
});