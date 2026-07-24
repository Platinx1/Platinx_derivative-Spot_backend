const express = require("express");
const {
  ping,
  getSinglePairTicker,
  getAllPairsTicker,
  getSpecificPairs,
} = require("../controllers/user/coinswitchSpot/coinswitchSpotController");
const {
  getCandles,
} = require("../controllers/user/coinswitchSpot/coinswitchSpotCandles");
const {
  getSupportedCoins,
  getCoinSwitchPairs,
} = require("../controllers/user/coinswitchSpot/coinswitchSpotActiveCoins");
const {
  getExchangePrecision,
} = require("../controllers/user/coinswitchSpot/coinswitchExchnagePrecision");
const {
  getTradeInfo,
  syncTradeInfo
} = require("../controllers/user/coinswitchSpot/coinswitchTradeInfo");
const {
  updateFuturesLeverage,
  setFuturesLeverage,
} = require("../controllers/user/coinswitchFuture/coinswitchUpdateLeverage");
const {
  getFuturesLeverage,
} = require("../controllers/user/coinswitchFuture/coinswithGetLeverage");
const {
  getFuturesWalletBalance,
} = require("../controllers/user/coinswitchFuture/coinswitchWalletBalance");
const {
  getUserPortfolio,
} = require("../controllers/user/coinswitchSpot/coinswitchSpotPortfolio");

const {
  getServerTime,
  getInstrumentsInfo,
  getTickers,
  getOrderbook,
  placeOrder,
  cancelOrder,
  getOpenOrders,
  getOrderHistory,
  getOrderDetails,
  getTradeHistory,
  switchPositionMode,
  getOpenPositions,
  setLeverage,
  setTpSl,
  transferFunds,
  closePosition,
} = require("../controllers/user/coinswitchHFT/coinswitchHFT");
const { createSpotOrder, cancelSpotOrder, getAllSpotOrders, getSpotOpenOrders, getSpotClosedOrders } = require("../controllers/user/coinswitchSpot/coinswitchPlaceOrder");
const { getUserTrades, getSpotTrades } = require("../controllers/user/coinswitchSpot/coinswitchSpotTrades");
const { getSpotTradingFee } = require("../controllers/user/coinswitchSpot/coinswitchTradingFee");
const {
  depositINRForSpot,
  withdrawINRFromSpot,
  getTransactionHistory,
  getWalletBalance,
} = require("../controllers/user/coinswitchSpot/coinswitchWallet");

const resolveCoinswitchAccount = require("../middleware/resolveCoinswitchAccount");

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
router.get("/spot/activeCoins", getSupportedCoins); // getSupportedCoins, syncTradeInfo
router.get("/spot/pairs", getCoinSwitchPairs); // db

//exchange precision
router.post("/spot/exchangePrecision", getExchangePrecision); // resolveCoinswitchAccount

//trade
router.get("/spot/tradeInfo", getTradeInfo);
// router.get("/spot/syncTradeInfo", syncTradeInfo); // getSupportedCoins, syncTradeInfo

//portfolio
// router.get("/spot/portfolio", getUserPortfolio);
router.get("/spot/portfolio", resolveCoinswitchAccount, getUserPortfolio);

//orders
// router.post('/spot/order', resolveCoinswitchAccount, createSpotOrder); // done
router.post('/spot/order', resolveCoinswitchAccount, createSpotOrder); // done
router.delete('/spot/orders/:orderId', cancelSpotOrder); // done
router.get('/spot/orders', resolveCoinswitchAccount, getAllSpotOrders); // done
// router.get('/spot/orders/open', getSpotOpenOrders);  // done
// router.get('/spot/orders/closed', getSpotClosedOrders);

//trades
router.get("/spot/trades", resolveCoinswitchAccount, getUserTrades);
// router.post('/spot/trades', getSpotTrades);

//trading fee (spot)
router.get('/spot/trading-fee', getSpotTradingFee);

// wallet
router.post('/spot/deposit-inr', resolveCoinswitchAccount, depositINRForSpot);
router.post('/spot/withdraw-inr', resolveCoinswitchAccount, withdrawINRFromSpot);
router.get('/spot/deposit-withdraw-history', resolveCoinswitchAccount, getTransactionHistory);

// wallet balance
router.get('/spot/wallet-balance', resolveCoinswitchAccount, getWalletBalance);




// Future endpoints (placeholders)
router.post("/futures/leverage", setFuturesLeverage);
router.get("/futures/leverage", getFuturesLeverage);
router.get("/futures/walletBalance", getFuturesWalletBalance);

// Futures Routes (Complete start to end: Fund in, config, trade, monitor, fund out)
router.post("/futures/transfer", transferFunds); // Step 1: Transfer funds IN/OUT
router.get("/futures/time", getServerTime); // Sync time
router.get("/futures/instruments", getInstrumentsInfo); // Get specs
router.get("/futures/tickers", getTickers); // Prices
router.get("/futures/orderbook", getOrderbook); // Depth
router.post("/futures/switch-mode", switchPositionMode); // Step 2: Set hedge/one-way
router.post("/futures/leverage", setLeverage); // Step 3: Set leverage
router.post("/futures/order", placeOrder); // Step 4: Place order
router.post("/futures/tpsl", setTpSl); // Step 5: Set TP/SL
router.post("/futures/close", closePosition); // Close position
router.post("/futures/cancel", cancelOrder); // Cancel open order
router.get("/futures/positions", getOpenPositions); // Tab: OPEN POSITIONS
router.get("/futures/open-orders", getOpenOrders); // Tab: OPEN ORDERS
router.get("/futures/trade-history", getTradeHistory); // Tab: TRADE HISTORY (executions)
router.get("/futures/order-history", getOrderHistory); // Tab: ORDER HISTORY (all orders)
router.get("/futures/order", getOrderDetails); // Specific order details

module.exports = router;
