const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParams } = require("../../../utils/urlAndParamsHelper");

const ENDPOINTS = {
  UPDATE_FUTURES_LEVERAGE: "/trade/api/v2/futures/leverage",
};

// 📋 Update Futures Leverage for a Symbol
// exports.updateFuturesLeverage = catchAsync(async (req, res, next) => {
//   console.log("Received request to update futures leverage---------------:", req.body);
//   const { symbol, leverage, exchange = "EXCHANGE_2" } = req.body;

//   // ── Input validation ───────────────────────────────────────────────
//   if (!symbol || typeof symbol !== "string") {
//     return next(new AppError("symbol is required and must be a string (e.g. BTCUSDT)", 400));
//   }

//   if (!leverage || !Number.isInteger(leverage) || leverage < 1) {
//     return next(new AppError("leverage must be a positive integer", 400));
//   }

//   // CoinSwitch docs say case insensitive, but we normalize to uppercase anyway
//   const normalizedExchange = exchange.toUpperCase();
//   if (normalizedExchange !== "EXCHANGE_2") {
//     return next(new AppError("Only 'EXCHANGE_2' is currently supported for futures leverage", 400));
//   }

//   const method = "POST";
//   const path = ENDPOINTS.UPDATE_FUTURES_LEVERAGE;

//   const payload = {
//     symbol: symbol.toUpperCase(),     // API usually expects uppercase (BTCUSDT, ETHUSDT, ...)
//     exchange: normalizedExchange,
//     leverage: leverage,
//   };

//   // Build URL (no query params in this endpoint)
//   const { fullUrl } = buildUrlAndParams(path, {}, payload);

//   // Generate signed headers (important: POST → include body in signature!)
//   const headers = getAuthHeaders(method, path, {}, payload);   // ← payload goes here if your helper supports it

//   console.log("headers===========================================:", headers);

//   try {
//     const response = await axios({
//       method,
//       url: fullUrl,
//       headers,
//       data: payload,                // JSON body
//     });

//     // You can add more response validation if needed
//     if (!response.data || typeof response.data !== "object") {
//       return next(new AppError("Invalid response format from CoinSwitch API", 500));
//     }

//     res.status(200).json({
//       success: true,
//       message: `Leverage updated to ${leverage}x for ${symbol.toUpperCase()}`,
//       data: response.data,
//     });
//   } catch (err) {
//     // Forward CoinSwitch error message if available
//     const errorMessage =
//       err.response?.data?.message ||
//       err.response?.data?.error ||
//       err.message ||
//       "Failed to update leverage";

//     return next(new AppError(errorMessage, err.response?.status || 500));
//   }
// });




// exports.updateFuturesLeverage = catchAsync(async (req, res, next) => {
//   console.log("[Leverage Update] Request body:", JSON.stringify(req.body, null, 2));

//   const { symbol, leverage, exchange = "EXCHANGE_2" } = req.body;

//   if (!symbol || typeof symbol !== "string" || !symbol.trim()) {
//     return next(new AppError("symbol is required (string, e.g. BTCUSDT)", 400));
//   }
//   if (!leverage || !Number.isInteger(Number(leverage)) || Number(leverage) < 1) {
//     return next(new AppError("leverage must be positive integer >= 1", 400));
//   }

//   const normExchange = exchange.toUpperCase().trim();
//   if (normExchange !== "EXCHANGE_2") {
//     return next(new AppError("exchange must be EXCHANGE_2 (case insensitive)", 400));
//   }

//   const payload = {
//     symbol: symbol.toUpperCase().trim(),
//     exchange: normExchange,
//     leverage: Number(leverage),
//   };

//   console.log("[Leverage Update] Payload:", JSON.stringify(payload, null, 2));

//   const method = "POST";
//   const path = ENDPOINTS.UPDATE_FUTURES_LEVERAGE;

//   // No query params → empty {}
//   const { fullUrl } = buildUrlAndParams(path, {});

//   // Pass bodyObj as 4th arg (now supported)
//   const headers = getAuthHeaders(method, path, {}, payload);

//   console.log("[Leverage Update] Headers:", {
//     ...headers,
//     "X-AUTH-SIGNATURE": "..." // hide in log
//   });

//   try {
//     const response = await axios({
//       method,
//       url: fullUrl,
//       headers,
//       data: payload,
//       timeout: 10000,
//     });

//     res.status(200).json({
//       success: true,
//       message: `Leverage set to ${payload.leverage}x for ${payload.symbol}`,
//       data: response.data,
//     });
//   } catch (err) {
//     console.error("[Leverage Update ERROR]");
//     console.error("Status:", err.response?.status);
//     console.error("API Response:", err.response?.data);
//     console.error("Message:", err.message);

//     const msg =
//       err.response?.data?.message ||
//       err.response?.data?.error ||
//       err.message ||
//       "Failed to update leverage";

//     return next(new AppError(msg, err.response?.status || 500));
//   }
// });



// 🎯 Set Futures Leverage (claude)
// exports.setFuturesLeverage = catchAsync(async (req, res, next) => {
//   const { symbol, exchange, leverage } = req.body;

//   // Validate required fields
//   if (!symbol) {
//     return next(new AppError("Symbol is required (e.g., BTCUSDT, ETHUSDT)", 400));
//   }

//   if (!exchange) {
//     return next(new AppError("Exchange is required", 400));
//   }

//   if (!leverage || !Number.isInteger(Number(leverage))) {
//     return next(new AppError("Leverage must be an integer", 400));
//   }

//   // Validate exchange
//   const exchangeUpper = exchange.toUpperCase();
//   if (exchangeUpper !== "EXCHANGE_2") {
//     return next(
//       new AppError('Invalid exchange. Allowed value: "EXCHANGE_2" (case insensitive)', 400)
//     );
//   }

//   // Validate leverage range (basic check - you may want to add max leverage validation)
//   const leverageNum = Number(leverage);
//   if (leverageNum < 1) {
//     return next(new AppError("Leverage must be at least 1", 400));
//   }

//   // Prepare body payload
//   const bodyPayload = {
//     symbol: symbol.toLowerCase(),  // API expects lowercase (btcusdt)
//     exchange: exchangeUpper,       // API expects uppercase (EXCHANGE_2)
//     leverage: leverageNum,
//   };

//   const method = "POST";
//   const path = ENDPOINTS.FUTURES_LEVERAGE;

//   // Build URL and path for signing
//   const { fullUrl, fullPath } = buildUrlAndParams(path, {}, bodyPayload);

//   // Get auth headers with body for signature
//   const headers = getAuthHeaders(method, fullPath, {}, bodyPayload);

//   console.log("headers===========================================:", headers);

//   const response = await axios({
//     method,
//     url: fullUrl,
//     headers,
//     data: bodyPayload,
//   });

//   // Response validation
//   if (!response.data || typeof response.data !== "object") {
//     return next(new AppError("Invalid response format from CoinSwitch API", 500));
//   }

//   const leverageData = response.data?.data || response.data;

//   res.status(200).json({
//     success: true,
//     message: "Futures leverage set successfully",
//     symbol: symbol.toLowerCase(),
//     exchange: exchangeUpper,
//     leverage: leverageNum,
//     data: leverageData,
//   });
// });




// 📋 Set Futures Leverage
exports.setFuturesLeverage11 = catchAsync(async (req, res, next) => {
  const { symbol, exchange, leverage } = req.body;

  // 🔎 Validate required params
  if (!symbol) {
    return next(new AppError("symbol is required (e.g. BTCUSDT)", 400));
  }

  if (!exchange) {
    return next(new AppError("exchange is required", 400));
  }

  if (
    typeof leverage !== "number" ||
    leverage < 1 ||
    !Number.isInteger(leverage)
  ) {
    return next(
      new AppError("leverage must be an integer greater than or equal to 1", 400)
    );
  }

  // Exchange validation (only EXCHANGE_2 allowed)
  const exchangeUpper = exchange.toUpperCase();
  if (exchangeUpper !== "EXCHANGE_2") {
    return next(
      new AppError(
        'Invalid exchange. Allowed value: "EXCHANGE_2" (case insensitive)',
        400
      )
    );
  }

  // ✅ Build body payload (IMPORTANT for signature)
  const bodyPayload = {
    symbol: symbol.toUpperCase(),     // BTCUSDT
    exchange: exchangeUpper,          // EXCHANGE_2
    leverage,                         // integer
  };

  const method = "POST";
  const path = ENDPOINTS.FUTURES_LEVERAGE;

  // No query params, body goes into signature
  const { fullUrl, fullPath } = buildUrlAndParams(path, {}, bodyPayload);

  const headers = getAuthHeaders(
    method,
    fullPath,
    {},              // no query params
    bodyPayload      // 👈 MUST pass body for correct signature
  );

  console.log(":::::::::::::::::::::::::::::::", headers);
  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", bodyPayload);

  const response = await axios({
    method,
    url: fullUrl,
    headers,
    data: bodyPayload,
  });

  if (!response.data || typeof response.data !== "object") {
    return next(new AppError("Invalid response from CoinSwitch API", 500));
  }

  res.status(200).json({
    success: true,
    message: "Futures leverage updated successfully",
    data: response.data,
  });
});






exports.setFuturesLeverage = catchAsync(async (req, res, next) => {
  const { symbol, exchange, leverage } = req.body;

  if (!symbol) {
    return next(new AppError("symbol is required (e.g. BTCUSDT)", 400));
  }

  if (!exchange) {
    return next(new AppError("exchange is required", 400));
  }

  if (!Number.isInteger(leverage) || leverage < 1) {
    return next(
      new AppError("leverage must be an integer >= 1", 400)
    );
  }

  const exchangeUpper = exchange.toUpperCase();
  if (exchangeUpper !== "EXCHANGE_2") {
    return next(
      new AppError('exchange must be "EXCHANGE_2"', 400)
    );
  }

  const bodyPayload = {
    symbol: symbol.toUpperCase(),
    exchange: exchangeUpper,
    leverage,
  };

  const method = "POST";
  const path = "/trade/api/v2/futures/leverage";

  const { fullUrl, fullPath } = buildUrlAndParams(path, {}, bodyPayload);

  const headers = getAuthHeaders(method, fullPath, {}, bodyPayload);

  console.log("headers===========================================:", headers);

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      data: bodyPayload,
      timeout: 10000,
    });

    return res.status(200).json({
      success: true,
      message: "Futures leverage updated successfully",
      data: response.data, // ✅ SAFE
    });

  } catch (err) {
    // ✅ Extract only serializable parts
    const statusCode = err.response?.status || 500;
    const apiMessage =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "CoinSwitch API error";

    console.error("CoinSwitch API ERROR:", err.response?.data);

    return next(new AppError(apiMessage, statusCode));
  }
});
