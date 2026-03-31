const express = require("express");

const {
  getExchangeInfo,
  getKlines,
  getMarketDepth,
  getAggTrade,
  getTicker24Hr
} = require("../controllers/user/pi42PublicEndpoints/pi42PublicEndpoints");
const { createPi42User, getPi42User, getUserMeta } = require("../controllers/user/pi42UserAccount/pi42UserAccount");
const { depositINR, withdrawINR, getDepositWithdrawHistory, getFuturesWalletDetails } = require("../controllers/user/pi42Wallet/pi42Wallet");
const { placeOrder, placeOrderWithLeverage, getOrderByClientOrderId, getMultipleOrdersByClientOrderId, getOpenOrders, cancelOrder, cancelAllOrders } = require("../controllers/user/pi42Orders/pi42Orders");
const { getPositions, getPositionById, getPositionsHistory, closeAllPositions, getMultiplePositions, setAutoTopUp, setAutoTopUpPreference, reversePosition } = require("../controllers/user/pi42Positions/pi42Positions");
const { updateLeverage } = require("../controllers/user/pi42Leverage/pi42Leverage");
const { getTransactionHistory, getTransactionHistorySync, getTransactionHistoryById } = require("../controllers/user/pi42Transaction/pi42Transaction");
const { getTradeHistory, getTradeHistorySync, getTradeHistoryById } = require("../controllers/user/pi42TradeHistory/pi42TradeHistory");
const { getMarginHistorySync } = require("../controllers/user/pi42MarginHistory/pi42MarginHistory");

const router = express.Router();


// public endpoints
router.get("/exchange-info", getExchangeInfo);
router.post("/klines", getKlines);
router.get("/market-depth/:contractPair", getMarketDepth);
router.get("/agg-trade/:contractPair", getAggTrade);
router.get("/ticker24Hr/:contractPair", getTicker24Hr);

// user
router.get("/create-user", createPi42User);
router.get("/get-user", getPi42User);
router.get("/user-meta", getUserMeta);

// wallet
router.post("/deposit-inr", depositINR);
router.post("/withdraw-inr", withdrawINR);
router.post("/deposit-withdraw-history", getDepositWithdrawHistory);
router.get("/futures-wallet/details", getFuturesWalletDetails);

// transaction history
router.get("/transaction-history", getTransactionHistory);
router.get("/transaction-history-sync", getTransactionHistorySync);
router.get("/transaction-history-by-id", getTransactionHistoryById);

// order
router.post("/place-order", placeOrder);
router.post("/place-order-with-leverage", placeOrderWithLeverage);
router.get("/order-by-client-order-id", getOrderByClientOrderId);
router.post("/get-multiple", getMultipleOrdersByClientOrderId);
router.get("/open-orders", getOpenOrders);  // open-orders vs order-history
router.post("/delete-order", cancelOrder);
router.post("/cancel-all-orders", cancelAllOrders);

// positions
router.get("/positions", getPositions);
router.get("/positions-by-id", getPositionById);
router.get("/positions/history", getPositionsHistory);
router.get("/positions/close-all-positions", closeAllPositions);
router.post("/positions/get-multiple", getMultiplePositions);
router.post("/positions/auto-top-up", setAutoTopUp); // set auto topup for a position
router.post("/positions/set-auto-top-up-prefernce", setAutoTopUpPreference); // set auto-topup preference for new positions
router.post("/positions/reverse-position", reversePosition);

// trade history
router.get("/trade-history", getTradeHistory); // trade history vs position history vs order history
router.get("/trade-history-sync", getTradeHistorySync); // trade history vs position history vs order history
router.get("/trade-history-by-id", getTradeHistoryById);

// margin history
router.get("/margin-history-sync", getMarginHistorySync);


// leverage
router.post("/leverage/update", updateLeverage);


module.exports = router;