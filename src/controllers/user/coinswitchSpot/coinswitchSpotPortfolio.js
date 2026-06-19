const axios = require("axios");
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParams } = require("../../../utils/urlAndParamsHelper");

const ENDPOINTS = {
  USER_PORTFOLIO: "/trade/api/v2/user/portfolio"
};

exports.getUserPortfolio = catchAsync(async (req, res, next) => {
  const method = "GET";
  const path = ENDPOINTS.USER_PORTFOLIO;

  // No query params required for this endpoint
  const queryObj = {};
  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // No body → pass null/undefined
  const headers = getAuthHeaders(method, path, queryObj, null);

  console.log("Portfolio Request URL:", fullUrl);
  console.log("Portfolio Headers:", headers);
  // Optional debug: log the exact string that was signed
  // (helps when debugging 401 Invalid Signature errors)
  // console.log("Signed message was:", `${method}${path}${headers["X-AUTH-EPOCH"]}`);

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      // timeout: 10000,           // optional - recommended for production
    });

    if (!response.data || typeof response.data !== "object") {
      return next(new AppError("Invalid response format from CoinSwitch API", 500));
    }

    // According to docs, useful data is usually in response.data.data
    // It's an array of holdings (each with currency, main_balance, current_value, etc.)
    const portfolioData = response.data?.data || response.data;

    // Optional: enrich response with some quick stats
    // let totalCurrentValue = 0;
    // let totalInvestedValue = 0;
    // let holdingsCount = 0;

    // if (Array.isArray(portfolioData)) {
    //   holdingsCount = portfolioData.length;
    //   portfolioData.forEach(holding => {
    //     const current = parseFloat(holding.current_value || 0);
    //     const invested = parseFloat(holding.invested_value || 0);
    //     totalCurrentValue += isNaN(current) ? 0 : current;
    //     totalInvestedValue += isNaN(invested) ? 0 : invested;
    //   });
    // }

    res.status(200).json({
      success: true,
      message: "User portfolio retrieved successfully",
      data: portfolioData,
      // summary: {
      //   totalHoldings: holdingsCount,
      //   estimatedTotalValue: totalCurrentValue.toFixed(2),
      //   totalInvested: totalInvestedValue.toFixed(2),
      //   // You can add pnl: (totalCurrentValue - totalInvestedValue).toFixed(2)
      // },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const apiErrorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Failed to fetch user portfolio";

    return next(new AppError(`CoinSwitch API error: ${apiErrorMessage}`, status));
  }
});



// exports.getUserPortfolio = catchAsync(async (req, res, next) => {
//   const { apiKey, apiSecret } = req.coinswitchAccount ;

//   const method = "GET";
//   const path = ENDPOINTS.USER_PORTFOLIO;

//   // No query params required for this endpoint
//   const queryObj = {};
//   const { fullUrl } = buildUrlAndParams(path, queryObj);

//   // No body → pass null/undefined
//   const headers = getAuthHeaders(method, path, queryObj, null, apiKey, apiSecret);

//   console.log("Portfolio Request URL:", fullUrl);
//   console.log("Portfolio Headers:", headers);
//   // Optional debug: log the exact string that was signed
//   // (helps when debugging 401 Invalid Signature errors)
//   // console.log("Signed message was:", `${method}${path}${headers["X-AUTH-EPOCH"]}`);

//   try {
//     const response = await axios({
//       method,
//       url: fullUrl,
//       headers,
//       // timeout: 10000,           // optional - recommended for production
//     });

//     if (!response.data || typeof response.data !== "object") {
//       return next(new AppError("Invalid response format from CoinSwitch API", 500));
//     }

//     // According to docs, useful data is usually in response.data.data
//     // It's an array of holdings (each with currency, main_balance, current_value, etc.)
//     const portfolioData = response.data?.data || response.data;

//     // Optional: enrich response with some quick stats
//     // let totalCurrentValue = 0;
//     // let totalInvestedValue = 0;
//     // let holdingsCount = 0;

//     // if (Array.isArray(portfolioData)) {
//     //   holdingsCount = portfolioData.length;
//     //   portfolioData.forEach(holding => {
//     //     const current = parseFloat(holding.current_value || 0);
//     //     const invested = parseFloat(holding.invested_value || 0);
//     //     totalCurrentValue += isNaN(current) ? 0 : current;
//     //     totalInvestedValue += isNaN(invested) ? 0 : invested;
//     //   });
//     // }

//     res.status(200).json({
//       success: true,
//       message: "User portfolio retrieved successfully",
//       data: portfolioData,
//       // summary: {
//       //   totalHoldings: holdingsCount,
//       //   estimatedTotalValue: totalCurrentValue.toFixed(2),
//       //   totalInvested: totalInvestedValue.toFixed(2),
//       //   // You can add pnl: (totalCurrentValue - totalInvestedValue).toFixed(2)
//       // },
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     const status = error.response?.status || 500;
//     const apiErrorMessage =
//       error.response?.data?.message ||
//       error.response?.data?.error ||
//       error.message ||
//       "Failed to fetch user portfolio";

//     return next(new AppError(`CoinSwitch API error: ${apiErrorMessage}`, status));
//   }
// });