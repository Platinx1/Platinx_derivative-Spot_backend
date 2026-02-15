const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");



const ENDPOINTS = {
 CANDLES: "/trade/api/v2/candles",
};

function buildUrlAndParams(basePath, queryObj = {}) {
  const queryString = new URLSearchParams(queryObj).toString();
  const fullPath = queryString ? `${basePath}?${queryString}` : basePath;
  const fullUrl = `${process.env.BASE_URL}${fullPath}`;
  return { fullUrl, queryObj, fullPath };
}

exports.getCandles = catchAsync(async (req, res, next) => {
  const {
    symbol = "BTC/INR",
    interval = "60",
    start_time: clientStartTime,
    end_time: clientEndTime,
    exchange = "coinswitchx",
  } = req.query;

  if (!symbol || !interval || !exchange) {
    return next(new AppError("symbol, interval, and exchange are required", 400));
  }

  // ────────────────────────────────────────────────
  // start_time: REQUIRED by API → default to last 7 days if missing
  let startTime;
  if (clientStartTime) {
    startTime = Number(clientStartTime);
    if (isNaN(startTime) || startTime <= 0) {
      return next(new AppError("start_time must be a valid positive UNIX timestamp in milliseconds", 400));
    }
  } else {
    startTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
    console.log(`[Candles] Default start_time used: ${new Date(startTime).toISOString()} (last 7 days)`);
  }

  // ────────────────────────────────────────────────
  // end_time: REQUIRED by API → default to NOW if missing
  let endTime;
  if (clientEndTime) {
    endTime = Number(clientEndTime);
    if (isNaN(endTime) || endTime <= 0 || endTime <= startTime) {
      return next(new AppError("end_time must be a valid UNIX timestamp in ms and after start_time", 400));
    }
  } else {
    endTime = Date.now(); // current time in ms
    console.log(`[Candles] Default end_time used: ${new Date(endTime).toISOString()} (now)`);
  }

  const method = "GET";
  const path = ENDPOINTS.CANDLES;

  const queryObj = {
    symbol,
    interval,
    exchange,
    start_time: startTime.toString(),
    end_time: endTime.toString(), // always include now
  };

  const { fullUrl } = buildUrlAndParams(path, queryObj);

  const headers = getAuthHeaders(method, path, queryObj);

  let response;
  try {
    response = await axios({ method, url: fullUrl, headers });
  } catch (axiosErr) {
    console.error("Axios error in getCandles:", {
      message: axiosErr.message,
      code: axiosErr.code,
      status: axiosErr.response?.status,
      data: axiosErr.response?.data,
      requestUrl: fullUrl,
    });

    return next(
      new AppError(
        `CoinSwitch API failed: ${axiosErr.message} - ${
          axiosErr.response?.data?.message || axiosErr.response?.statusText || "Unknown error"
        }`,
        axiosErr.response?.status || 502
      )
    );
  }

  const candlesData = response.data?.data || response.data || [];
  const totalCandles = Array.isArray(candlesData) ? candlesData.length : 0;

  res.status(200).json({
    success: true,
    message: "Candles data retrieved successfully",
    data: candlesData,
    totalCandles,
    paramsUsed: {
      symbol,
      interval,
      exchange,
      start_time: startTime,
      end_time: endTime,
    },
    note: !clientStartTime || !clientEndTime ? "One or both time parameters were auto-set (defaults: last 7 days to now)" : undefined,
  });
});