const express = require("express");

const {
  getExchangeInfo,
  getKlines,
  getMarketDepth,
  getAggTrade,
  getTicker24Hr
} = require("../controllers/user/pi42PublicEndpoints/pi42PublicEndpoints");
const { registerPlatinxUser, registerPlatinxUserForFutures, createPi42UserAccount, getPi42User, getUserMeta, getAccountByUser } = require("../controllers/user/pi42UserAccount/pi42UserAccount");
const { depositINR, withdrawINR, getDepositWithdrawHistory, getDepositWithdrawHistoryFromDB, getFuturesWalletDetails } = require("../controllers/user/pi42Wallet/pi42Wallet");
const { placeOrder, placeOrderWithLeverage, getOrderByClientOrderId, getMultipleOrdersByClientOrderId, getOpenOrders, editOrder, cancelOrder, cancelAllOrders } = require("../controllers/user/pi42Orders/pi42Orders");
const { getPositions, getPositionById, getPositionsHistory, closeAllPositions, getMultiplePositions, setAutoTopUp, setAutoTopUpPreference, reversePosition } = require("../controllers/user/pi42Positions/pi42Positions");
const { updateLeverage } = require("../controllers/user/pi42Leverage/pi42Leverage");
const { getTransactionHistory, getTransactionHistorySync, getTransactionHistoryById } = require("../controllers/user/pi42Transaction/pi42Transaction");
const { getTradeHistory, getTradeHistorySync, getTradeHistoryById, getTradesByPosition } = require("../controllers/user/pi42TradeHistory/pi42TradeHistory");
const { getMarginHistorySync } = require("../controllers/user/pi42MarginHistory/pi42MarginHistory");
const { getPairByName } = require("../controllers/user/pi42Pairs/pi42Pairs");

const resolvePi42Account = require("../middleware/resolvePi42Account");
const verifyAccessToken = require("../middleware/verifyAccessToken");
const resolvePi42Account = require("../middleware/resolvePi42AccountFromToken");
const { getBasePairs, getDeliveryTimes, getInstrumentInfo, getInstrumentInfoBySymbols, getConversionRate, getOrderBook, getRecentTrades } = require("../controllers/user/pi42Options/publicEndpoints/publicEndpoints");
const { createPi42UsersOptionsAccount } = require("../controllers/user/pi42Options/createAccount/createAccount");
const { transferBalance, getOptionsWalletBalance } = require("../controllers/user/pi42Options/wallet/wallet");
const { placeOptionsOrder, getOpenOptionsOrders, getOptionsOrderHistory, getOptionsOrderDetails, getOptionsOrderByRefId, deleteOptionsOrder, editOptionsOrder, deleteAllOptionsOrders } = require("../controllers/user/pi42Options/orders/orders");
const { getOpenPositions, getPositionHistory } = require("../controllers/user/pi42Options/positions/positions");

const router = express.Router();


// public endpoints
router.get("/exchange-info", getExchangeInfo);
router.post("/klines", getKlines);
router.get("/market-depth/:contractPair", getMarketDepth);
router.get("/agg-trade/:contractPair", getAggTrade);
router.get("/ticker24Hr/:contractPair", getTicker24Hr);

// user
router.post("/link-user-futures-account", registerPlatinxUser);
router.get("/create-user", createPi42UserAccount);
router.get("/get-user", getPi42User);
router.get("/user-meta", getUserMeta); // will return leverage preference, auto top-up
router.get("/user-data", getAccountByUser); 

// wallet
router.post("/deposit-inr", verifyAccessToken, resolvePi42Account, depositINR);
router.post("/withdraw-inr", verifyAccessToken, resolvePi42Account, withdrawINR);
router.post("/deposit-withdraw-history", verifyAccessToken, resolvePi42Account, getDepositWithdrawHistory);
router.post("/wallet-history", verifyAccessToken, resolvePi42Account, getDepositWithdrawHistoryFromDB); // db
router.get("/futures-wallet/details", verifyAccessToken, resolvePi42Account, getFuturesWalletDetails);

// transaction history
router.get("/transaction-history", verifyAccessToken, resolvePi42Account, getTransactionHistory);
router.get("/transaction-history-sync", verifyAccessToken, resolvePi42Account, getTransactionHistorySync);
router.get("/transaction-history-by-id", verifyAccessToken, resolvePi42Account, getTransactionHistoryById);

// order
router.post("/place-order", verifyAccessToken, resolvePi42Account, placeOrder);
router.post("/place-order-with-leverage", verifyAccessToken, resolvePi42Account, placeOrderWithLeverage);
router.get("/order-by-client-order-id", verifyAccessToken, resolvePi42Account, getOrderByClientOrderId);
router.post("/order/get-multiple", verifyAccessToken, resolvePi42Account, getMultipleOrdersByClientOrderId);
router.get("/open-orders", verifyAccessToken, resolvePi42Account, getOpenOrders);  // open-orders vs order-history
router.post("/edit-order", verifyAccessToken, resolvePi42Account, editOrder);
router.post("/delete-order", verifyAccessToken, resolvePi42Account, cancelOrder);
router.post("/cancel-all-orders", verifyAccessToken, resolvePi42Account, cancelAllOrders);

// positions
router.get("/positions", verifyAccessToken, resolvePi42Account, getPositions);
router.get("/positions-by-id", verifyAccessToken, resolvePi42Account, getPositionById);
router.get("/positions/history", verifyAccessToken, resolvePi42Account, getPositionsHistory);
router.get("/positions/close-all-positions", verifyAccessToken, resolvePi42Account, closeAllPositions);
router.post("/positions/get-multiple", verifyAccessToken, resolvePi42Account, getMultiplePositions);
router.post("/positions/auto-top-up", verifyAccessToken, resolvePi42Account, setAutoTopUp); // set auto topup for a position
router.post("/positions/set-auto-top-up-prefernce", verifyAccessToken, resolvePi42Account, setAutoTopUpPreference); // set auto-topup preference for new positions
router.post("/positions/reverse-position", verifyAccessToken, resolvePi42Account, reversePosition);

// trade history
router.get("/trade-history", verifyAccessToken, resolvePi42Account, getTradeHistory); // trade history vs position history vs order history
router.get("/trade-history-sync", verifyAccessToken, resolvePi42Account, getTradeHistorySync); // trade history vs position history vs order history
router.get("/trade-history-by-id", verifyAccessToken, resolvePi42Account, getTradeHistoryById);
router.get("/trades-by-position", verifyAccessToken, resolvePi42Account, getTradesByPosition); // from db


// margin history
router.get("/margin-history-sync", verifyAccessToken, resolvePi42Account, getMarginHistorySync);


// leverage
router.post("/leverage/update", verifyAccessToken, resolvePi42Account, updateLeverage);

// pair info
router.get("/pair-by-name", verifyAccessToken, resolvePi42Account, getPairByName);


// -------------------------- options endpoints --------------------------


// public endpoints
router.get('/options/base-pairs', getBasePairs);
router.get('/options/delivery-times', getDeliveryTimes);
router.get('/options/instrument-info', getInstrumentInfo);
router.post('/options/instrument-info-symbol', getInstrumentInfoBySymbols);
router.get('/options/meta', getConversionRate);
router.get('/options/order-book', getOrderBook);
router.get('/options/recent-trades', getRecentTrades);

// create options account
router.post('/options/create-options-account', verifyAccessToken, resolvePi42Account, createPi42UsersOptionsAccount);

// wallet
router.post('/options/wallet/transfer-balance', verifyAccessToken, resolvePi42Account, transferBalance);
router.get('/options/wallet/details', verifyAccessToken, resolvePi42Account, getOptionsWalletBalance);

// orders
router.post('/options/place-order', verifyAccessToken, resolvePi42Account, placeOptionsOrder);
router.get('/options/open-orders',verifyAccessToken, resolvePi42Account, getOpenOptionsOrders);
router.get('/options/order-history', verifyAccessToken, resolvePi42Account, getOptionsOrderHistory);
router.get('/options/order-details', verifyAccessToken, resolvePi42Account, getOptionsOrderDetails);
router.get('/options/order/ref-id', verifyAccessToken, resolvePi42Account, getOptionsOrderByRefId);
router.delete('/options/delete-order', verifyAccessToken, resolvePi42Account, deleteOptionsOrder);
router.patch('/options/edit-order', verifyAccessToken, resolvePi42Account, editOptionsOrder);
router.delete('/options/delete-all-orders', verifyAccessToken, resolvePi42Account, deleteAllOptionsOrders);

// positions
router.get('/options/open-positions', verifyAccessToken, resolvePi42Account, getOpenPositions);
router.get('/options/position-history', verifyAccessToken, resolvePi42Account, getPositionHistory);

module.exports = router;