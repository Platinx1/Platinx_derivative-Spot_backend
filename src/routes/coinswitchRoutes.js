const express = require("express");
const {
  ping,
  getSinglePairTicker,
  getAllPairsTicker,
  getSpecificPairs,
} = require("../controllers/user/coinswitchSpot/coinswitchSpotController");
const { getCandles } = require("../controllers/user/coinswitchSpot/coinswitchSpotCandles");
const { getSupportedCoins } = require("../controllers/user/coinswitchSpot/coinswitchSpotActiveCoins");
const { getExchangePrecision } = require("../controllers/user/coinswitchSpot/coinswitchExchnagePrecision");
const { getTradeInfo } = require("../controllers/user/coinswitchSpot/coinswitchTradeInfo");
const { updateFuturesLeverage, setFuturesLeverage } = require("../controllers/user/coinswitchFuture/coinswitchUpdateLeverage");
const { getFuturesLeverage } = require("../controllers/user/coinswitchFuture/coinswithGetLeverage");
const { getFuturesWalletBalance } = require("../controllers/user/coinswitchFuture/coinswitchWalletBalance");
const { getUserPortfolio } = require("../controllers/user/coinswitchSpot/coinswitchSpotPortfolio");

const router = express.Router();

// 🔌 Connection test
router.get("/ping", ping);

// 📊spot Ticker endpoints
router.get("/spot/ticker/single", getSinglePairTicker);
router.get("/spot/ticker/all", getAllPairsTicker);
router.get("/spot/ticker/specific", getSpecificPairs);

//candles 
router.get("/spot/candles", getCandles);

//active coins
router.get("/spot/activeCoins", getSupportedCoins);

//exchange precision
router.post("/spot/exchangePrecision", getExchangePrecision);

//trade info
router.get("/spot/tradeInfo", getTradeInfo);

//portfolio
router.get("/spot/portfolio", getUserPortfolio);



// Future endpoints (placeholders)
router.post("/futures/leverage", setFuturesLeverage);
router.get("/futures/leverage", getFuturesLeverage);
router.get("/futures/walletBalance", getFuturesWalletBalance);



module.exports = router;