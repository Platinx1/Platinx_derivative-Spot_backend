const express = require("express");
const {
  ping,
  getSinglePairTicker,
  getAllPairsTicker,
  getSpecificPairs,
} = require("../controllers/user/coinswitch/coinswitchSpotController");
const { getCandles } = require("../controllers/user/coinswitch/coinswitchSpotCandles");

const router = express.Router();

// 🔌 Connection test
router.get("/ping", ping);

// 📊spot Ticker endpoints
router.get("/spot/ticker/single", getSinglePairTicker);
router.get("/spot/ticker/all", getAllPairsTicker);
router.get("/spot/ticker/specific", getSpecificPairs);

//candles 
router.get("/spot/candles", getCandles);

module.exports = router;