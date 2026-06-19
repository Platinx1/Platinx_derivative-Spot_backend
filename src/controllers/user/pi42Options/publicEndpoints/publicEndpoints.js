const axios = require('axios');
const catchAsync = require('./../../../../utils/catchAsync');
const AppError = require('./../../../../utils/AppError');


exports.getBasePairs = catchAsync(async (req, res, next) => {
  const endpoint = '/v1/exchange/basePairs';
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  let response;
  try {
    const apiRes = await axios.get(url);
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Get Base Pairs Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch base pairs",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Base pairs fetched successfully",
    data: response,
  });
});


// exports.getDeliveryTimes = catchAsync(async (req, res, next) => {
//   const { baseCoin, quoteCoin } = req.query;

//   if (!baseCoin || !quoteCoin) {
//     return next(new AppError("baseCoin and quoteCoin query parameters are required", 400));
//   }

//   const endpoint = '/v1/exchange/delivery-times';
//   const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}?baseCoin=${encodeURIComponent(baseCoin.trim().toUpperCase())}&quoteCoin=${encodeURIComponent(quoteCoin.trim().toUpperCase())}`;

//   let response;
//   try {
//     const apiRes = await axios.get(url);
//     response = apiRes.data;
//   } catch (err) {
//     console.error("❌ PI42 Delivery Times Error:", err?.response?.data || err.message);
//     return next(
//       new AppError(
//         err?.response?.data?.message || "Failed to fetch delivery times",
//         err?.response?.status || 500
//       )
//     );
//   }

//   res.status(200).json({
//     status: true,
//     message: `Delivery times fetched successfully for ${baseCoin}`,
//     data: response,
//   });
// });

exports.getDeliveryTimes = catchAsync(async (req, res, next) => {
  const { baseCoin, quoteCoin = "USDT" } = req.query;

  if (!baseCoin) {
    return next(new AppError("baseCoin query parameter is required", 400));
  }

  const baseCoinUpper = baseCoin.trim().toUpperCase();
  const quoteCoinUpper = quoteCoin ? quoteCoin.trim().toUpperCase() : "USDT";

  let url = `${process.env.PI42_OPTIONS_BASE_URL}/v1/exchange/delivery-times?baseCoin=${encodeURIComponent(baseCoinUpper)}`;

  if (quoteCoinUpper) {
    url += `&quoteCoin=${encodeURIComponent(quoteCoinUpper)}`;
  }

  let response;
  try {
    const apiRes = await axios.get(url);
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Delivery Times Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch delivery times",
        err?.response?.status || 500
      )
    );
  }

  // Enhanced response for better UI consumption
  const deliveryTimes = Array.isArray(response) ? response : [];

  const formattedData = deliveryTimes.map((timestamp) => {
    const date = new Date(timestamp);

    // Format: DD-MM-YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return {
      timestamp,                                      // Original UNIX timestamp (ms)
      deliveryDate: date.toISOString(),               // Full ISO format
      readableDate: `${day}-${month}-${year}`,        // DD-MM-YYYY (as requested)
      readableTime: date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toLowerCase(),                               // e.g., "01:30 pm"
      dayOfWeek: date.toLocaleDateString('en-IN', { weekday: 'long' }),
      fullReadable: `${day}-${month}-${year} (${date.toLocaleDateString('en-IN', { weekday: 'short' })})`,
    };
  });

  res.status(200).json({
    status: true,
    message: `Delivery times fetched successfully for ${baseCoinUpper}`,
    data: {
      baseCoin: baseCoinUpper,
      quoteCoin: quoteCoinUpper,
      deliveryDates: formattedData,        // UI-friendly format
    }
  });
});


exports.getInstrumentInfo = catchAsync(async (req, res, next) => {
  const { baseCoin, quoteCoin, deliveryTime } = req.query;

  if (!baseCoin || !quoteCoin) {
    return next(new AppError("baseCoin and quoteCoin query parameters are required", 400));
  }

  let url = `${process.env.PI42_OPTIONS_BASE_URL}/v1/exchange/instrument-info?baseCoin=${encodeURIComponent(baseCoin.trim().toUpperCase())}&quoteCoin=${encodeURIComponent(quoteCoin.trim().toUpperCase())}`;

  if (deliveryTime) {
    url += `&deliveryTime=${deliveryTime}`;
  }

  let response;
  try {
    const apiRes = await axios.get(url);
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Instrument Info Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch instrument info",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Instrument info fetched successfully",
    data: response,
  });
});


exports.getInstrumentInfoBySymbols = catchAsync(async (req, res, next) => {
  const { symbols } = req.body;

  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return next(new AppError("symbols array is required in body", 400));
  }

  const endpoint = '/v1/exchange/instrument-info-symbol';
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  let response;
  try {
    const apiRes = await axios.post(url, { symbols });
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Instrument Info Symbols Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch instrument info by symbols",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Instrument info by symbols fetched successfully",
    data: response,
  });
});


exports.getConversionRate = catchAsync(async (req, res, next) => {
  const endpoint = '/v1/exchange/meta';
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}`;

  let response;
  try {
    const apiRes = await axios.get(url);
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Conversion Rate Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch conversion rate",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: "Conversion rate fetched successfully",
    data: response,
  });
});


exports.getOrderBook = catchAsync(async (req, res, next) => {
  const { symbol } = req.query;

  if (!symbol) {
    return next(new AppError("symbol query parameter is required", 400));
  }

  const endpoint = '/v1/market/orderBook';
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}?symbol=${encodeURIComponent(symbol.trim())}`;

  let response;
  try {
    const apiRes = await axios.get(url);
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Order Book Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch order book",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: `Order book fetched for ${symbol}`,
    data: response,
  });
});


exports.getRecentTrades = catchAsync(async (req, res, next) => {
  const { symbol } = req.query;

  if (!symbol) {
    return next(new AppError("symbol query parameter is required", 400));
  }

  const endpoint = '/v1/market/recentTrades';
  const url = `${process.env.PI42_OPTIONS_BASE_URL}${endpoint}?symbol=${encodeURIComponent(symbol.trim())}`;

  let response;
  try {
    const apiRes = await axios.get(url);
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Recent Trades Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch recent trades",
        err?.response?.status || 500
      )
    );
  }

  res.status(200).json({
    status: true,
    message: `Recent trades fetched for ${symbol}`,
    data: response,
  });
});
