const express = require("express");
const {
  ping,
  getSinglePairTicker,
  getAllPairsTicker,
  getSpecificPairs,
  getTopPairsByVolume,
  getPriceStats,
  comparePairs,
  getMarketSummary,
} = require("../controllers/user/coinswitch/coinswitchController");

const router = express.Router();

// 🔌 Connection test
router.get("/ping", ping);

// 📊 Ticker endpoints
router.get("/ticker/single", getSinglePairTicker);
router.get("/ticker/all", getAllPairsTicker);
router.get("/ticker/specific", getSpecificPairs);
router.get("/ticker/top", getTopPairsByVolume);

// 📈 Analysis endpoints
router.get("/stats/price", getPriceStats);
router.get("/stats/compare", comparePairs);
router.get("/stats/market-summary", getMarketSummary);

module.exports = router;