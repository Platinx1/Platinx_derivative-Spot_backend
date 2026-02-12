// const axios = require("axios");
// const catchAsync = require("../../../utils/catchAsync");
// const AppError = require("../../../utils/AppError");
// const { getAuthHeaders } = require("../../../utils/signatureHelper");

// const ENDPOINTS = {
//   FUTURES_LEVERAGE: "/trade/api/v2/futures/leverage",
// };

// function buildUrlAndParams(basePath, queryObj = {}) {
//   // URLSearchParams maintains insertion order
//   const queryString = new URLSearchParams(queryObj).toString();
//   const fullPath = queryString ? `${basePath}?${queryString}` : basePath;
//   const fullUrl = `${process.env.BASE_URL}${fullPath}`;
  
//   console.log("Query Object:", queryObj);
//   console.log("Query String:", queryString);
//   console.log("Full Path:", fullPath);
  
//   return { fullUrl, queryObj, fullPath };
// }

// // 📋 Get Futures Leverage (current leverage set for a symbol on futures exchange)
// // exports.getFuturesLeverage = catchAsync(async (req, res, next) => {
// //   const { 
// //     symbol= "btcusdt", 
// //     exchange = "EXCHANGE_2" 
// //   } = req.query;

// //   // Validate required symbol
// //   if (!symbol || typeof symbol !== "string" || symbol.trim() === "") {
// //     return next(new AppError("Symbol is required (e.g., BTCUSDT, ETHUSDT)", 400));
// //   }

// //   // Validate exchange (required)
// //   const validExchanges = ["EXCHANGE_2"];
// //   const exchangeUpper = exchange.toUpperCase();
// //   if (!validExchanges.includes(exchangeUpper)) {
// //     return next(
// //       new AppError(
// //         `Invalid exchange. Allowed value: ${validExchanges.join(", ")} (case insensitive)`,
// //         400
// //       )
// //     );
// //   }

// //   const method = "GET";
// //   const path = ENDPOINTS.FUTURES_LEVERAGE;

// //   const queryObj = {
// //     symbol: symbol.toUpperCase(),     // normalize to uppercase (BTCUSDT, ETHUSDT, ...)
// //     exchange: exchangeUpper,
// //   };

// //   const { fullUrl, fullPath } = buildUrlAndParams(path, queryObj);

// //   // For GET → pass query params for signature generation
// //   const headers = getAuthHeaders(method, fullPath, queryObj);
// //   console.log("Futures Leverage Headers:", headers);
// //   console.log("Full URL:", fullUrl);

// //   const response = await axios({
// //     method,
// //     url: fullUrl,
// //     headers,
// //   });

// //   // Basic response validation
// //   if (!response.data || typeof response.data !== "object") {
// //     return next(new AppError("Invalid response format from CoinSwitch API", 500));
// //   }

// //   const leverageData = response.data?.data || response.data;

// //   res.status(200).json({
// //     success: true,
// //     message: "Futures leverage retrieved successfully",
// //     symbol: queryObj.symbol,
// //     exchange: exchangeUpper,
// //     data: leverageData,
// //   });
// // });



// exports.getFuturesLeverage = catchAsync(async (req, res, next) => {
//   const { 
//     symbol = "btcusdt",  // default lowercase
//     exchange = "EXCHANGE_2" 
//   } = req.query;

//   // Validation...
//   if (!symbol || typeof symbol !== "string" || symbol.trim() === "") {
//     return next(new AppError("Symbol is required (e.g., btcusdt, ethusdt)", 400));
//   }

//   const validExchanges = ["EXCHANGE_2"];
//   const exchangeUpper = exchange.toUpperCase();
//   if (!validExchanges.includes(exchangeUpper)) {
//     return next(
//       new AppError(
//         `Invalid exchange. Allowed value: ${validExchanges.join(", ")} (case insensitive)`,
//         400
//       )
//     );
//   }

//   const method = "GET";
//   const path = ENDPOINTS.FUTURES_LEVERAGE;

//   // 🔧 Use lowercase symbol as per API docs
//   const queryObj = {
//     symbol: symbol.toLowerCase(),     // "btcusdt" not "BTCUSDT"
//     exchange: exchangeUpper,          // "EXCHANGE_2"
//   };

//   const { fullUrl, fullPath } = buildUrlAndParams(path, queryObj);

//   // 🔧 For GET, pass queryObj to include in signature
//   const headers = getAuthHeaders(method, fullPath, queryObj);

//   console.log("Full URL:", fullUrl);
//   console.log("Full Path (for signing):", fullPath);
//   console.log("Headers:", headers);

//   try {
//     const response = await axios({
//       method,
//       url: fullUrl,
//       headers,
//       timeout: 10000,
//     });

//     const leverageData = response.data?.data || response.data;

//     res.status(200).json({
//       success: true,
//       message: "Futures leverage retrieved successfully",
//       symbol: queryObj.symbol,
//       exchange: exchangeUpper,
//       data: leverageData,
//     });
    
//   } catch (axiosError) {
//     console.error("Axios Error:", {
//       message: axiosError.message,
//       status: axiosError.response?.status,
//       data: axiosError.response?.data,
//     });
    
//     const errorMessage = axiosError.response?.data?.message 
//       || "Failed to fetch leverage data";
      
//     return next(new AppError(errorMessage, axiosError.response?.status || 500));
//   }
// });




const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParams } = require("../../../utils/urlAndParamsHelper");

const ENDPOINTS = {
  FUTURES_LEVERAGE: "/trade/api/v2/futures/leverage",
};

// 📋 Get Futures Leverage (current leverage set for a symbol on futures exchange)
exports.getFuturesLeverage = catchAsync(async (req, res, next) => {
  const { 
    symbol = "btcusdt",  // default lowercase as per API docs
    exchange = "EXCHANGE_2" 
  } = req.query;

  // Validate required symbol
  if (!symbol || typeof symbol !== "string" || symbol.trim() === "") {
    return next(new AppError("Symbol is required (e.g., btcusdt, ethusdt)", 400));
  }

  // Validate exchange (required)
  const validExchanges = ["EXCHANGE_2"];
  const exchangeUpper = exchange.toUpperCase();
  if (!validExchanges.includes(exchangeUpper)) {
    return next(
      new AppError(
        `Invalid exchange. Allowed value: ${validExchanges.join(", ")} (case insensitive)`,
        400
      )
    );
  }

  const method = "GET";
  const path = ENDPOINTS.FUTURES_LEVERAGE;

  // Use lowercase symbol as per API docs
  const queryObj = {
    symbol: symbol.toLowerCase(),     // "btcusdt" not "BTCUSDT"
    exchange: exchangeUpper,          // "EXCHANGE_2"
  };

  // Build URL for the actual request
  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // 🔧 FIXED: Pass 'path' (base path without query) instead of 'fullPath'
  // This matches your working getSupportedCoins code
  const headers = getAuthHeaders(method, path, queryObj);

  console.log("Full URL:", fullUrl);
  console.log("Headers:", headers);

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      timeout: 10000,
    });

    // Basic response validation
    if (!response.data || typeof response.data !== "object") {
      return next(new AppError("Invalid response format from CoinSwitch API", 500));
    }

    const leverageData = response.data?.data || response.data;

    res.status(200).json({
      success: true,
      message: "Futures leverage retrieved successfully",
      symbol: queryObj.symbol,
      exchange: exchangeUpper,
      data: leverageData,
    });
    
  } catch (axiosError) {
    console.error("Axios Error:", {
      message: axiosError.message,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    });
    
    const errorMessage = axiosError.response?.data?.message 
      || "Failed to fetch leverage data";
      
    return next(new AppError(errorMessage, axiosError.response?.status || 500));
  }
});