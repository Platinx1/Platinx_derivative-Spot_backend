const axios = require("axios");

const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const Pi42Pairs = require("../../../models/pi42Models/pi42Pairs");



exports.getExchangeInfo = catchAsync(async (req, res, next) => {
  const { market = "INR", pair } = req.query;

  let pairValue

  if(pair) pairValue = pair.trim().toUpperCase();

  const endpoint = `/v1/exchange/exchangeInfo`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}?market=${encodeURIComponent(market)}`;

  let response;

  try {
    const apiRes = await axios.get(url); // simple GET request, no headers
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Get Exchange Info Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch exchange info",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Exchange info not found", 404));
  }

  let allData = response;

  if (pairValue) {
    allData = allData.contracts.filter(data => data.name === pairValue);
  }


  res.status(200).json({
    status: true,
    message: `Exchange info fetched successfully for market ${market}`,
    data: allData,
  });
});


// exports.getExchangeInfo = catchAsync(async (req, res, next) => {
//   const { market = "INR", pair } = req.query;

//   let pairValue

//   if(pair) pairValue = pair.trim().toUpperCase();

//   const endpoint = `/v1/exchange/exchangeInfo`;
//   const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}?market=${encodeURIComponent(market)}`;

//   let response;

//   try {
//     const apiRes = await axios.get(url); // simple GET request, no headers
//     response = apiRes.data;
//   } catch (err) {
//     console.error(
//       "❌ PI42 Get Exchange Info Error:",
//       err?.response?.data || err.message
//     );

//     return next(
//       new AppError(
//         err?.response?.data?.message || "Failed to fetch exchange info",
//         err?.response?.status || 500
//       )
//     );
//   }

//   const contracts =
//     response?.data?.contracts ||   // expected shape
//     response?.contracts ||          // fallback if top-level
//     [];
 
//   if (!contracts.length) {
//     console.error("❌ No contracts found. Full response:", JSON.stringify(response));
//     return next(new AppError("No contracts found to sync", 404));
//   }
 
//   // Pick only the required fields from each contract
//   // const contractDocs = contracts.map((contract) => ({
//   //   name: contract.name,
//   //   contractName: contract.contractName,
//   //   makerFee: contract.makerFee,
//   //   takerFee: contract.takerFee,
//   //   maxLeverage: contract.maxLeverage,
//   //   liquidationFee: contract.liquidationFee,
//   //   pricePrecision: contract.pricePrecision,
//   //   quantityPrecision: contract.quantityPrecision,
//   //   marginBufferPercentage: contract.marginBufferPercentage,
//   //   depthGrouping: contract.depthGrouping[0],
//   //   iconUrl: contract.iconUrl,
//   // }));

//   const contractDocs = contracts.map((contract) => {

//   // Find MIN_NOTIONAL filter
//   const minNotionalFilter = contract.filters?.find(
//     (f) => f.filterType === "MIN_NOTIONAL"
//   );

//   return {
//     name: contract.name,
//     contractName: contract.contractName,
//     makerFee: contract.makerFee,
//     takerFee: contract.takerFee,
//     maxLeverage: contract.maxLeverage,
//     liquidationFee: contract.liquidationFee,
//     pricePrecision: contract.pricePrecision,
//     quantityPrecision: contract.quantityPrecision,
//     marginBufferPercentage: contract.marginBufferPercentage,
//     depthGrouping: contract.depthGrouping[0],
//     iconUrl: contract.iconUrl,

//     // Save notional value
//     notional: minNotionalFilter?.notional || "0",
//   };
// });
 
//   // insertMany with ordered: false so one duplicate doesn't abort the whole batch
//   const inserted = await Pi42Pairs.insertMany(contractDocs, {
//     ordered: false,   // continues inserting even if some duplicates fail
//     rawResult: true,  // returns insertedCount etc.
//   });


//   res.status(200).json({
//     status: true,
//     message: `Exchange info fetched successfully for market ${market}`,
//     // data: allData,
//   });
// });


exports.getKlines = catchAsync(async (req, res, next) => {
  const { pair, interval, startTime, endTime, limit } = req.body;
  const { priceType } = req.query; // optional query param

  // 🔥 Validations
  if (!pair || !interval) {
    return next(new AppError("pair and interval are required", 400));
  }

  const payload = {
    pair: pair.trim().toUpperCase(),
    interval,
    startTime,
    endTime,
    limit: limit || 500, // default 500 if not provided
  };

  const endpoint = `/v1/market/klines`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  // If priceType is provided in query, append as query param
  const queryParams = priceType ? `?priceType=${encodeURIComponent(priceType)}` : "";

  let response;

  try {
    const apiRes = await axios.post(`${url}${queryParams}`, payload); // POST request with body
    response = apiRes.data;
  } catch (err) {
    console.error(
      "❌ PI42 Get Klines Error:",
      err?.response?.data || err.message
    );

    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch klines",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Klines data not found", 404));
  }

  res.status(200).json({
    status: true,
    message: `Klines data fetched successfully for pair ${pair.toUpperCase()}`,
    data: response,
  });
});


exports.getMarketDepth = catchAsync(async (req, res, next) => {
  const { contractPair } = req.params;

  if (!contractPair) {
    return next(new AppError("contractPair is required", 400));
  }

  const pairValue = contractPair.trim().toUpperCase(); // normalize

  const endpoint = `/v1/market/depth/${pairValue}`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  let response;

  try {
    const apiRes = await axios.get(url);
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Market Depth Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch market depth",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Market depth data not found", 404));
  }

  res.status(200).json({
    status: true,
    message: `Market depth fetched successfully for ${pairValue}`,
    data: response,
  });
});


exports.getAggTrade = catchAsync(async (req, res, next) => {
  const { contractPair } = req.params;

  if (!contractPair) {
    return next(new AppError("contractPair is required", 400));
  }

  const pairValue = contractPair.trim().toUpperCase(); // normalize

  const endpoint = `/v1/market/aggTrade/${pairValue}`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  console.log("=============================",url);

  let response;

  try {
    const apiRes = await axios.get(url);
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 Agg Trade Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch aggregate trade data",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("Aggregate trade data not found", 404));
  }

  res.status(200).json({
    status: true,
    message: `Aggregate trade data fetched successfully for ${pairValue}`,
    data: response,
  });
});


exports.getTicker24Hr = catchAsync(async (req, res, next) => {
  const { contractPair } = req.params;

  if (!contractPair) {
    return next(new AppError("contractPair is required", 400));
  }

  const pairValue = contractPair.trim().toUpperCase(); // normalize

  const endpoint = `/v1/market/ticker24Hr/${pairValue}`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  let response;

  try {
    const apiRes = await axios.get(url);
    response = apiRes.data;
  } catch (err) {
    console.error("❌ PI42 24Hr Ticker Error:", err?.response?.data || err.message);
    return next(
      new AppError(
        err?.response?.data?.message || "Failed to fetch 24Hr ticker data",
        err?.response?.status || 500
      )
    );
  }

  if (!response) {
    return next(new AppError("24Hr ticker data not found", 404));
  }

  res.status(200).json({
    status: true,
    message: `24Hr ticker data fetched successfully for ${pairValue}`,
    data: response,
  });
});