const express = require("express");
const {
  ping,
  getSinglePairTicker,
  getAllPairsTicker,
  getSpecificPairs,
} = require("../controllers/user/conswitchSpot/coinswitchSpotController");
const { getCandles } = require("../controllers/user/conswitchSpot/coinswitchSpotCandles");
const { getSupportedCoins } = require("../controllers/user/conswitchSpot/coinswitchSpotActiveCoins");

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
router.get("/spot/active-coins", getSupportedCoins);

module.exports = router;