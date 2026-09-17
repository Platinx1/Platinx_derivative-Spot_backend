// const CoinswitchOrder = require("../models/coinswitchModels/coinswitchOrder");
// const CoinswitchPortfolio = require("../models/coinswitchModels/coinswitchPortfolio");
// const CoinswitchTrade = require("../models/coinswitchModels/coinswitchTrade");
// const CoinswitchWallet = require("../models/coinswitchModels/coinswitchWallet");
// const { toDecimal128 } = require("../models/pi42Models/decimal");
// const mongoose = require("mongoose");

// const round4 = (num) => Number((Number(num) || 0).toFixed(4));
// const round8 = (num) => Number((Number(num) || 0).toFixed(8));

// const toDecimalInc = (value, negate = false) => {
//   const v = negate ? -value : value;
//   return mongoose.Types.Decimal128.fromString(String(v));
// };

// // Safe stringify helper — never crashes on undefined/null Decimal128 fields.
// const s = (val) => (val === undefined || val === null ? "NULL" : String(val));

// const LINE = "────────────────────────────────────────────────────────";

// exports.updateCoinswitchOrder = async (socketData) => {
//   console.log("\n" + "=".repeat(70));
//   console.log("🟢 updateCoinswitchOrder CALLED");
//   console.log("📥 socketData:", JSON.stringify(socketData));
//   console.log("=".repeat(70));

//   try {
//     const orderId = socketData.i;
//     const rawSymbol = socketData.s.toUpperCase();        // XRPINR
//     const symbol = rawSymbol.replace("INR", "/INR");     // XRP/INR
//     const side = socketData.S; // BUY / SELL
//     const isBuy = side === "BUY";

//     const FEE_RATE = 0.004; // 0.4%
//     const TERMINAL_NO_FILL_STATUSES = ["CANCELLED", "DISCARDED", "EXPIRED"];

//     const existingOrder = await CoinswitchOrder.findOne({ orderId });

//     const prevExecutedQty = Number(existingOrder?.executedQty || 0);
//     const prevAvgPrice = Number(existingOrder?.averagePrice || 0);
//     const prevLockedBalance = Number(existingOrder?.lockedBalance || 0);

//     const orderQty = Number(socketData.V || 0);
//     const filledQty = Number(socketData.z || 0);
//     const limitPrice = Number(socketData.p) || 0;
//     const avgFillPrice = Number(socketData.v) || 0;
//     const referencePrice = limitPrice || avgFillPrice || 0;

//     const remainingQty = Math.max(0, orderQty - filledQty);

//     console.log(LINE);
//     console.log("STEP 1: ORDER CONTEXT");
//     console.log(LINE);
//     console.log("orderId:", orderId, "| symbol:", symbol, "| side:", side, "| status:", socketData.X);
//     console.log("existingOrder found:", !!existingOrder);
//     console.log("prevExecutedQty (before this event):", prevExecutedQty);
//     console.log("filledQty (z, cumulative, from this event):", filledQty);

//     // ==================== LOCKED BALANCE (for the Order doc) ====================
//     let lockedAmount = 0;      // INR, BUY only
//     let lockedQtyForSell = 0;  // base-asset qty, SELL only

//     if (!TERMINAL_NO_FILL_STATUSES.includes(socketData.X)) {
//       if (isBuy) {
//         const amountBeforeFee = remainingQty * referencePrice;
//         lockedAmount = amountBeforeFee * (1 + FEE_RATE);
//       } else {
//         lockedQtyForSell = remainingQty;
//       }
//     }

//     // ==================== UPDATE ORDER ====================
//     const updateData = {
//       side,
//       type: socketData.o,
//       symbol,
//       price: toDecimal128(socketData.p),
//       quantity: toDecimal128(socketData.V),
//       executedQty: toDecimal128(socketData.z),
//       averagePrice: toDecimal128(socketData.v),
//       status: socketData.X,
//       exchange: socketData.e,
//       createdTime: socketData.O ? new Date(Number(socketData.O)) : undefined,
//       updatedTime: socketData.E ? new Date(Number(socketData.E)) : undefined,
//       lockedBalance: isBuy ? lockedAmount : lockedQtyForSell,
//     };

//     Object.keys(updateData).forEach((key) => {
//       if (updateData[key] === undefined) delete updateData[key];
//     });

//     const order = await CoinswitchOrder.findOneAndUpdate(
//       { orderId },
//       { $set: updateData },
//       { new: true, upsert: true }
//     );

//     console.log(LINE);
//     console.log("STEP 2: ORDER SAVED");
//     console.log(LINE);
//     console.log("order._id:", s(order?._id));
//     console.log("order.coinswitchAccount:", order?.coinswitchAccount ? s(order.coinswitchAccount) : "❌ MISSING/UNDEFINED — THIS IS LIKELY THE BUG SOURCE");
//     console.log("order.status:", order?.status);

//     // ==================== FILL DELTA ====================
//     const rawDeltaQty = filledQty - prevExecutedQty; // z is cumulative — only the NEW fill matters
//     const deltaQty = round8(rawDeltaQty);

//     console.log(LINE);
//     console.log("STEP 3: FILL DELTA CALCULATION");
//     console.log(LINE);
//     console.log("rawDeltaQty (filledQty - prevExecutedQty, BEFORE rounding):", rawDeltaQty);
//     console.log("deltaQty (AFTER round8):", deltaQty);

//     let deltaNotional = 0;
//     let deltaFillPrice = 0;
//     let fee = 0;

//     if (deltaQty > 0) {
//       const prevNotional = prevExecutedQty * prevAvgPrice;
//       const newNotional = filledQty * avgFillPrice;
//       deltaNotional = round4(newNotional - prevNotional);
//       deltaFillPrice = round4(deltaQty > 0 ? deltaNotional / deltaQty : 0);
//       fee = round4(deltaNotional * FEE_RATE);

//       console.log("deltaNotional:", deltaNotional, "| deltaFillPrice:", deltaFillPrice, "| fee:", fee);

//       let portfolio = await CoinswitchPortfolio.findOne({
//         coinswitchAccount: order.coinswitchAccount,
//         symbol,
//       });

//       console.log(LINE);
//       console.log("STEP 4: PORTFOLIO — BEFORE THIS UPDATE (raw from DB)");
//       console.log(LINE);
//       if (portfolio) {
//         console.log("Portfolio EXISTS. Current stored values:");
//         console.log("  totalQuantity   :", s(portfolio.totalQuantity));
//         console.log("  totalInvested   :", s(portfolio.totalInvested));
//         console.log("  averageBuyPrice :", s(portfolio.averageBuyPrice));
//       } else {
//         console.log("Portfolio DOES NOT EXIST YET — will be created fresh.");
//       }

//       let realizedPnl = 0;
//       if (!isBuy && portfolio) {
//         const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;
//         realizedPnl = round4((deltaFillPrice - avgBuyPrice) * deltaQty - fee);
//       }

//       // === Trade record — this is our IMMUTABLE, append-only source of truth. ===
//       const tradeDoc = await CoinswitchTrade.create({
//         coinswitchAccount: order.coinswitchAccount,
//         orderId,
//         symbol,
//         side,
//         price: toDecimal128(deltaFillPrice),
//         quantity: toDecimal128(deltaQty),
//         fee: toDecimal128(fee),
//         totalAmount: toDecimal128(round4(deltaNotional + fee)),
//         realizedPnl: toDecimal128(realizedPnl),
//         tradeTime: socketData.E ? new Date(Number(socketData.E)) : new Date(),
//       });

//       console.log(LINE);
//       console.log("STEP 5: NEW TRADE RECORD CREATED");
//       console.log(LINE);
//       console.log("Trade._id:", s(tradeDoc._id));
//       console.log("Trade.side:", tradeDoc.side, "| Trade.quantity (as stored):", s(tradeDoc.quantity));

//       // ==================== totalInvested update (incremental) ====================
//       if (isBuy) {
//         await CoinswitchPortfolio.findOneAndUpdate(
//           { coinswitchAccount: order.coinswitchAccount, symbol },
//           {
//             $inc: { totalInvested: toDecimalInc(deltaNotional) },
//             $set: { lastUpdatedAt: new Date() },
//             $setOnInsert: { isActive: true, isDeleted: false, totalQuantity: toDecimal128("0") },
//           },
//           { new: true, upsert: true }
//         );
//       } else if (portfolio) {
//         const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;
//         const investedReduction = round4(avgBuyPrice * deltaQty);

//         await CoinswitchPortfolio.findOneAndUpdate(
//           { coinswitchAccount: order.coinswitchAccount, symbol },
//           {
//             $inc: { totalInvested: toDecimalInc(investedReduction, true) },
//             $set: { lastUpdatedAt: new Date() },
//           },
//           { new: true }
//         );
//       }

//       console.log(LINE);
//       console.log("STEP 6: totalInvested INCREMENTED (via MongoDB $inc, Decimal128)");
//       console.log(LINE);

//       // ================================================================
//       // ==================== totalQuantity — recompute from ledger =====
//       // ================================================================
//       const allTrades = await CoinswitchTrade.find({
//         coinswitchAccount: order.coinswitchAccount,
//         symbol,
//         isDeleted: false,
//       })
//         .select("side quantity tradeTime")
//         .sort({ tradeTime: 1 })
//         .lean();

//       console.log(LINE);
//       console.log(`STEP 7: FULL TRADE LEDGER for this account+symbol (${allTrades.length} trades)`);
//       console.log(LINE);
//       allTrades.forEach((t, idx) => {
//         console.log(`  [${idx}] side=${t.side.padEnd(4)} quantity="${s(t.quantity)}"  time=${t.tradeTime}`);
//       });

//       const [agg] = await CoinswitchTrade.aggregate([
//         {
//           $match: {
//             coinswitchAccount: order.coinswitchAccount,
//             symbol,
//             isDeleted: false,
//           },
//         },
//         {
//           $group: {
//             _id: null,
//             buyQty: { $sum: { $cond: [{ $eq: ["$side", "BUY"] }, "$quantity", "0"] } },
//             sellQty: { $sum: { $cond: [{ $eq: ["$side", "SELL"] }, "$quantity", "0"] } },
//           },
//         },
//         { $project: { netQty: { $subtract: ["$buyQty", "$sellQty"] } } },
//       ]);

//       console.log(LINE);
//       console.log("STEP 8: MONGODB AGGREGATION RESULT (exact Decimal128 sum, no JS math involved)");
//       console.log(LINE);
//       if (agg) {
//         console.log("  SUM of all BUY quantities  :", s(agg.buyQty));
//         console.log("  SUM of all SELL quantities :", s(agg.sellQty));
//         console.log("  netQty (buy - sell), RAW Decimal128 string from Mongo:", s(agg.netQty));
//       } else {
//         console.log("  ❌ No trades matched — agg is null");
//       }

//       const netQtyRaw = agg && agg.netQty !== undefined ? String(agg.netQty) : "0";
//       const netQtyParsed = parseFloat(netQtyRaw);
//       const netQty = round8(netQtyParsed);
//       const finalQty = Math.max(0, netQty);

//       console.log(LINE);
//       console.log("STEP 9: CONVERTING AGGREGATION RESULT TO FINAL totalQuantity");
//       console.log(LINE);
//       console.log("  netQtyRaw (Decimal128 string, exact)      :", netQtyRaw);
//       console.log("  netQtyParsed (after parseFloat -> JS num)  :", netQtyParsed);
//       console.log("  netQty (after round8)                      :", netQty);
//       console.log("  finalQty (after Math.max(0, ...))           :", finalQty);

//       const finalQtyStr = String(finalQty);
//       if (finalQtyStr.replace(".", "").length > 10) {
//         console.error("  🚨🚨🚨 GARBAGE DETECTED — finalQty has too many digits:", finalQtyStr, "🚨🚨🚨");
//         console.error("  🚨 This proves the corruption exists BEFORE we even save it.");
//         console.error("  🚨 Check STEP 7 / STEP 8 above — one of the raw trade quantities or the aggregation itself already contains this noise.");
//       } else {
//         console.log("  ✅ finalQty is clean — safe to save.");
//       }

//       const portfolioAfterInvested = await CoinswitchPortfolio.findOne({
//         coinswitchAccount: order.coinswitchAccount,
//         symbol,
//       });
//       const currentInvested = round4(Number(portfolioAfterInvested?.totalInvested) || 0);
//       const finalAvgBuyPrice = isBuy
//         ? round4(finalQty > 0 ? currentInvested / finalQty : deltaFillPrice)
//         : round4(Number(portfolioAfterInvested?.averageBuyPrice) || 0);

//       console.log(LINE);
//       console.log("STEP 10: SAVING FINAL PORTFOLIO VALUES");
//       console.log(LINE);
//       console.log("  Writing totalQuantity   :", finalQty);
//       console.log("  Writing totalInvested   :", currentInvested);
//       console.log("  Writing averageBuyPrice :", finalAvgBuyPrice);

//       await CoinswitchPortfolio.updateOne(
//         { coinswitchAccount: order.coinswitchAccount, symbol },
//         {
//           $set: {
//             totalQuantity: toDecimal128(finalQty),
//             averageBuyPrice: toDecimal128(finalAvgBuyPrice),
//             lastUpdatedAt: new Date(),
//           },
//         }
//       );

//       const verifyPortfolio = await CoinswitchPortfolio.findOne({
//         coinswitchAccount: order.coinswitchAccount,
//         symbol,
//       });

//       console.log(LINE);
//       console.log("STEP 11: PORTFOLIO — AFTER SAVE (verified fresh read from DB)");
//       console.log(LINE);
//       console.log("  totalQuantity   :", s(verifyPortfolio?.totalQuantity));
//       console.log("  totalInvested   :", s(verifyPortfolio?.totalInvested));
//       console.log("  averageBuyPrice :", s(verifyPortfolio?.averageBuyPrice));
//       console.log(LINE);
//       console.log(`  SUMMARY: was "${portfolio ? s(portfolio.totalQuantity) : "0 (new)"}" -> now "${s(verifyPortfolio?.totalQuantity)}" (delta applied: ${deltaQty})`);
//       console.log(LINE);
//     } else {
//       console.log("⚠️ Skipping fill block — deltaQty is NOT > 0. No Trade/Portfolio update needed for this event.");
//     }

//     // ==================== WALLET UPDATE (runs on EVERY event) ====================
//     const consumed = isBuy && deltaQty > 0 ? (deltaNotional + fee) : 0;

//     const wallet = await CoinswitchWallet.findOne({ coinswitchAccount: order.coinswitchAccount });

//     if (wallet) {
//       let free = Number(wallet.freeBalance) || 0;
//       let locked = Number(wallet.lockedBalance) || 0;
//       let total = Number(wallet.totalBalance) || 0;

//       if (isBuy) {
//         const lockedDelta = lockedAmount - prevLockedBalance;
//         const freeToLockedTransfer = lockedDelta + consumed;

//         locked += lockedDelta;
//         free -= freeToLockedTransfer;
//         total -= consumed;
//       } else if (deltaQty > 0) {
//         const credit = deltaNotional - fee;
//         free += credit;
//         total += credit;
//       }

//       wallet.freeBalance = round4(Math.max(0, free));
//       wallet.lockedBalance = round4(Math.max(0, locked));
//       wallet.totalBalance = round4(Math.max(0, total));
//       wallet.availableForSpot = wallet.freeBalance;
//       wallet.lastUpdatedAt = new Date();
//       await wallet.save();

//       console.log(LINE);
//       console.log("STEP 12: WALLET UPDATED");
//       console.log(LINE);
//       console.log("  freeBalance:", s(wallet.freeBalance), "| lockedBalance:", s(wallet.lockedBalance), "| totalBalance:", s(wallet.totalBalance));
//     }

//     console.log("=".repeat(70));
//     console.log("✅ updateCoinswitchOrder COMPLETED for orderId:", orderId);
//     console.log("=".repeat(70) + "\n");

//     return order;
//   } catch (error) {
//     console.error("❌❌❌ Error updating Coinswitch Order & Portfolio:", error);
//     throw error;
//   }
// };





// const CoinswitchOrder = require("../models/coinswitchModels/coinswitchOrder");
// const CoinswitchPortfolio = require("../models/coinswitchModels/coinswitchPortfolio");
// const CoinswitchTrade = require("../models/coinswitchModels/coinswitchTrade");
// const CoinswitchWallet = require("../models/coinswitchModels/coinswitchWallet");
// const { toDecimal128 } = require("../models/pi42Models/decimal");
// const mongoose = require("mongoose");
// const Decimal = require("decimal.js"); // npm install decimal.js

// const round4 = (num) => Number((Number(num) || 0).toFixed(4));
// const round8 = (num) => Number((Number(num) || 0).toFixed(8));

// const toDecimalInc = (value, negate = false) => {
//   const v = negate ? -value : value;
//   return mongoose.Types.Decimal128.fromString(String(v));
// };

// const s = (val) => (val === undefined || val === null ? "NULL" : String(val));

// const LINE = "────────────────────────────────────────────────────────";

// exports.updateCoinswitchOrder = async (socketData) => {
//   // 🆕 GUARANTEED per-call marker — ye HAR order pe print hoga, na ki sirf module load pe
//   console.log("🆕🆕🆕 [FUNCTION CALLED] updateCoinswitchOrder — decimal.js VERSION — " + new Date().toISOString() + " 🆕🆕🆕");

//   console.log("\n" + "=".repeat(70));
//   console.log("🟢 updateCoinswitchOrder CALLED");
//   console.log("📥 socketData:", JSON.stringify(socketData));
//   console.log("=".repeat(70));

//   try {
//     const orderId = socketData.i;
//     const rawSymbol = socketData.s.toUpperCase();
//     const symbol = rawSymbol.replace("INR", "/INR");
//     const side = socketData.S;
//     const isBuy = side === "BUY";

//     const FEE_RATE = 0.004;
//     const TERMINAL_NO_FILL_STATUSES = ["CANCELLED", "DISCARDED", "EXPIRED"];

//     const existingOrder = await CoinswitchOrder.findOne({ orderId });

//     const prevExecutedQty = Number(existingOrder?.executedQty || 0);
//     const prevAvgPrice = Number(existingOrder?.averagePrice || 0);
//     const prevLockedBalance = Number(existingOrder?.lockedBalance || 0);

//     const orderQty = Number(socketData.V || 0);
//     const filledQty = Number(socketData.z || 0);
//     const limitPrice = Number(socketData.p) || 0;
//     const avgFillPrice = Number(socketData.v) || 0;
//     const referencePrice = limitPrice || avgFillPrice || 0;

//     const remainingQty = Math.max(0, orderQty - filledQty);

//     console.log(LINE);
//     console.log("STEP 1: ORDER CONTEXT");
//     console.log(LINE);
//     console.log("orderId:", orderId, "| symbol:", symbol, "| side:", side, "| status:", socketData.X);
//     console.log("existingOrder found:", !!existingOrder);
//     console.log("prevExecutedQty:", prevExecutedQty, "| filledQty:", filledQty);

//     let lockedAmount = 0;
//     let lockedQtyForSell = 0;

//     if (!TERMINAL_NO_FILL_STATUSES.includes(socketData.X)) {
//       if (isBuy) {
//         const amountBeforeFee = remainingQty * referencePrice;
//         lockedAmount = amountBeforeFee * (1 + FEE_RATE);
//       } else {
//         lockedQtyForSell = remainingQty;
//       }
//     }

//     const updateData = {
//       side,
//       type: socketData.o,
//       symbol,
//       price: toDecimal128(socketData.p),
//       quantity: toDecimal128(socketData.V),
//       executedQty: toDecimal128(socketData.z),
//       averagePrice: toDecimal128(socketData.v),
//       status: socketData.X,
//       exchange: socketData.e,
//       createdTime: socketData.O ? new Date(Number(socketData.O)) : undefined,
//       updatedTime: socketData.E ? new Date(Number(socketData.E)) : undefined,
//       lockedBalance: isBuy ? lockedAmount : lockedQtyForSell,
//     };

//     Object.keys(updateData).forEach((key) => {
//       if (updateData[key] === undefined) delete updateData[key];
//     });

//     const order = await CoinswitchOrder.findOneAndUpdate(
//       { orderId },
//       { $set: updateData },
//       { new: true, upsert: true }
//     );

//     console.log(LINE);
//     console.log("STEP 2: ORDER SAVED —", s(order?._id));
//     console.log("order.coinswitchAccount:", order?.coinswitchAccount ? s(order.coinswitchAccount) : "❌ MISSING/UNDEFINED");
//     console.log(LINE);

//     const rawDeltaQty = filledQty - prevExecutedQty;
//     const deltaQty = round8(rawDeltaQty);

//     console.log(LINE);
//     console.log("STEP 3: FILL DELTA —", deltaQty);
//     console.log(LINE);

//     let deltaNotional = 0;
//     let deltaFillPrice = 0;
//     let fee = 0;

//     if (deltaQty > 0) {
//       const prevNotional = prevExecutedQty * prevAvgPrice;
//       const newNotional = filledQty * avgFillPrice;
//       deltaNotional = round4(newNotional - prevNotional);
//       deltaFillPrice = round4(deltaQty > 0 ? deltaNotional / deltaQty : 0);
//       fee = round4(deltaNotional * FEE_RATE);

//       console.log("deltaNotional:", deltaNotional, "| deltaFillPrice:", deltaFillPrice, "| fee:", fee);

//       let portfolio = await CoinswitchPortfolio.findOne({
//         coinswitchAccount: order.coinswitchAccount,
//         symbol,
//       });

//       console.log(LINE);
//       console.log("STEP 4: PORTFOLIO BEFORE —", portfolio ? s(portfolio.totalQuantity) : "NEW (does not exist yet)");
//       console.log(LINE);

//       let realizedPnl = 0;
//       if (!isBuy && portfolio) {
//         const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;
//         realizedPnl = round4((deltaFillPrice - avgBuyPrice) * deltaQty - fee);
//       }

//       const tradeDoc = await CoinswitchTrade.create({
//         coinswitchAccount: order.coinswitchAccount,
//         orderId,
//         symbol,
//         side,
//         price: toDecimal128(deltaFillPrice),
//         quantity: toDecimal128(deltaQty),
//         fee: toDecimal128(fee),
//         totalAmount: toDecimal128(round4(deltaNotional + fee)),
//         realizedPnl: toDecimal128(realizedPnl),
//         tradeTime: socketData.E ? new Date(Number(socketData.E)) : new Date(),
//       });

//       console.log(LINE);
//       console.log("STEP 5: TRADE CREATED —", s(tradeDoc._id), "| qty:", s(tradeDoc.quantity));
//       console.log(LINE);

//       if (isBuy) {
//         await CoinswitchPortfolio.findOneAndUpdate(
//           { coinswitchAccount: order.coinswitchAccount, symbol },
//           {
//             $inc: { totalInvested: toDecimalInc(deltaNotional) },
//             $set: { lastUpdatedAt: new Date() },
//             $setOnInsert: { isActive: true, isDeleted: false, totalQuantity: toDecimal128("0") },
//           },
//           { new: true, upsert: true }
//         );
//       } else if (portfolio) {
//         const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;
//         const investedReduction = round4(avgBuyPrice * deltaQty);

//         await CoinswitchPortfolio.findOneAndUpdate(
//           { coinswitchAccount: order.coinswitchAccount, symbol },
//           {
//             $inc: { totalInvested: toDecimalInc(investedReduction, true) },
//             $set: { lastUpdatedAt: new Date() },
//           },
//           { new: true }
//         );
//       }

//       console.log(LINE);
//       console.log("STEP 6: totalInvested INCREMENTED");
//       console.log(LINE);

//       // ================================================================
//       // ====== totalQuantity — recompute from ledger using decimal.js ==
//       // ================================================================
//       const allTrades = await CoinswitchTrade.find({
//         coinswitchAccount: order.coinswitchAccount,
//         symbol,
//         isDeleted: false,
//       })
//         .select("side quantity tradeTime")
//         .sort({ tradeTime: 1 })
//         .lean();

//       console.log(LINE);
//       console.log(`STEP 7: TRADE LEDGER (${allTrades.length} trades)`);
//       console.log(LINE);
//       allTrades.forEach((t, idx) => {
//         console.log(`  [${idx}] side=${t.side.padEnd(4)} quantity="${s(t.quantity)}" time=${t.tradeTime}`);
//       });

//       // 🆕 GUARANTEED marker — har fill pe chalega, decimal.js summation se PEHLE
//       console.log("🆕🆕🆕 [DECIMAL.JS SUMMATION BLOCK REACHED] — " + new Date().toISOString() + " 🆕🆕🆕");

//       let buyQtyDec = new Decimal(0);
//       let sellQtyDec = new Decimal(0);

//       allTrades.forEach((t) => {
//         const qtyStr = s(t.quantity) === "NULL" ? "0" : String(t.quantity);
//         const qtyDec = new Decimal(qtyStr);
//         if (t.side === "BUY") {
//           buyQtyDec = buyQtyDec.plus(qtyDec);
//         } else if (t.side === "SELL") {
//           sellQtyDec = sellQtyDec.plus(qtyDec);
//         }
//       });

//       const netQtyDec = buyQtyDec.minus(sellQtyDec);

//       console.log(LINE);
//       console.log("STEP 8: decimal.js EXACT SUM (no floating point involved)");
//       console.log(LINE);
//       console.log("  buyQtyDec  :", buyQtyDec.toString());
//       console.log("  sellQtyDec :", sellQtyDec.toString());
//       console.log("  netQtyDec  :", netQtyDec.toString());

//       const finalQtyDec = Decimal.max(0, netQtyDec).toDecimalPlaces(8);
//       const finalQtyStr = finalQtyDec.toString();
//       const finalQty = Number(finalQtyStr);

//       console.log(LINE);
//       console.log("STEP 9: FINAL totalQuantity (decimal.js) —", finalQtyStr);
//       console.log(LINE);

//       if (finalQtyStr.replace(".", "").replace("-", "").length > 10) {
//         console.error("  🚨 GARBAGE STILL DETECTED:", finalQtyStr);
//       } else {
//         console.log("  ✅ finalQty is clean.");
//       }

//       const portfolioAfterInvested = await CoinswitchPortfolio.findOne({
//         coinswitchAccount: order.coinswitchAccount,
//         symbol,
//       });
//       const currentInvested = round4(Number(portfolioAfterInvested?.totalInvested) || 0);
//       const finalAvgBuyPrice = isBuy
//         ? round4(finalQty > 0 ? currentInvested / finalQty : deltaFillPrice)
//         : round4(Number(portfolioAfterInvested?.averageBuyPrice) || 0);

//       console.log(LINE);
//       console.log("STEP 10: SAVING — totalQuantity:", finalQtyStr, "| totalInvested:", currentInvested, "| averageBuyPrice:", finalAvgBuyPrice);
//       console.log(LINE);

//       await CoinswitchPortfolio.updateOne(
//         { coinswitchAccount: order.coinswitchAccount, symbol },
//         {
//           $set: {
//             totalQuantity: toDecimal128(finalQtyStr),
//             averageBuyPrice: toDecimal128(finalAvgBuyPrice),
//             lastUpdatedAt: new Date(),
//           },
//         }
//       );

//       const verifyPortfolio = await CoinswitchPortfolio.findOne({
//         coinswitchAccount: order.coinswitchAccount,
//         symbol,
//       });

//       console.log(LINE);
//       console.log("STEP 11: VERIFIED AFTER SAVE — totalQuantity:", s(verifyPortfolio?.totalQuantity));
//       console.log("  totalInvested   :", s(verifyPortfolio?.totalInvested));
//       console.log("  averageBuyPrice :", s(verifyPortfolio?.averageBuyPrice));
//       console.log(LINE);
//     } else {
//       console.log("⚠️ Skipping fill block — deltaQty is NOT > 0. No Trade/Portfolio update needed.");
//     }

//     // ==================== WALLET UPDATE (runs on EVERY event) ====================
//     const consumed = isBuy && deltaQty > 0 ? (deltaNotional + fee) : 0;

//     const wallet = await CoinswitchWallet.findOne({ coinswitchAccount: order.coinswitchAccount });

//     if (wallet) {
//       let free = Number(wallet.freeBalance) || 0;
//       let locked = Number(wallet.lockedBalance) || 0;
//       let total = Number(wallet.totalBalance) || 0;

//       if (isBuy) {
//         const lockedDelta = lockedAmount - prevLockedBalance;
//         const freeToLockedTransfer = lockedDelta + consumed;

//         locked += lockedDelta;
//         free -= freeToLockedTransfer;
//         total -= consumed;
//       } else if (deltaQty > 0) {
//         const credit = deltaNotional - fee;
//         free += credit;
//         total += credit;
//       }

//       wallet.freeBalance = round4(Math.max(0, free));
//       wallet.lockedBalance = round4(Math.max(0, locked));
//       wallet.totalBalance = round4(Math.max(0, total));
//       wallet.availableForSpot = wallet.freeBalance;
//       wallet.lastUpdatedAt = new Date();
//       await wallet.save();

//       console.log(LINE);
//       console.log("STEP 12: WALLET UPDATED — free:", s(wallet.freeBalance), "| locked:", s(wallet.lockedBalance), "| total:", s(wallet.totalBalance));
//       console.log(LINE);
//     }

//     console.log("=".repeat(70));
//     console.log("✅ updateCoinswitchOrder COMPLETED for orderId:", orderId);
//     console.log("=".repeat(70) + "\n");

//     return order;
//   } catch (error) {
//     console.error("❌❌❌ Error updating Coinswitch Order & Portfolio:", error);
//     throw error;
//   }
// };










/*
const CoinswitchOrder = require("../models/coinswitchModels/coinswitchOrder");
const CoinswitchPortfolio = require("../models/coinswitchModels/coinswitchPortfolio");
const CoinswitchTrade = require("../models/coinswitchModels/coinswitchTrade");
const CoinswitchWallet = require("../models/coinswitchModels/coinswitchWallet");
const Decimal = require("decimal.js");
const { toDecimal128, cleanDecimalString } = require("../models/pi42Models/decimal");

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

// Derive holdings from the trade ledger on every order event. This prevents
// float accumulation and repairs legacy values like 0.00014000000000000001,
// including when the current event itself contains no new fill.
const reconcilePortfolioQuantity = async (coinswitchAccount, symbol) => {
  if (!coinswitchAccount) return null;

  const trades = await CoinswitchTrade.find({
    coinswitchAccount,
    symbol,
    isDeleted: false,
  })
    .select("side quantity")
    .lean({ getters: false });

  if (!trades.length) return null;

  let netQuantity = new Decimal(0);
  for (const trade of trades) {
    const quantity = new Decimal(trade.quantity ? trade.quantity.toString() : "0")
      .toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
    netQuantity = trade.side === "SELL"
      ? netQuantity.minus(quantity)
      : netQuantity.plus(quantity);
  }

  const cleanQuantity = Decimal.max(0, netQuantity)
    .toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
  const cleanQuantityString = cleanDecimalString(cleanQuantity, 8);

  await CoinswitchPortfolio.updateOne(
    { coinswitchAccount, symbol },
    {
      $set: {
        totalQuantity: toDecimal128(cleanQuantityString, 8),
        lastUpdatedAt: new Date(),
      },
    }
  );

  console.log("RECONCILED exact portfolio quantity:", cleanQuantityString);
  return cleanQuantityString;
};

const s = (val) => (val === undefined || val === null ? "NULL" : String(val));
const LINE = "────────────────────────────────────────────────────────";

exports.updateCoinswitchOrder = async (socketData) => {
  // console.log("🟢 [FUNCTION CALLED] updateCoinswitchOrder — STRICT DECIMAL FIX — " + new Date().toISOString());

  try {
    const orderId = socketData.i;
    const rawSymbol = socketData.s.toUpperCase();
    const symbol = rawSymbol.replace("INR", "/INR");
    const side = socketData.S;
    const isBuy = side === "BUY";

    const FEE_RATE_DEC = new Decimal("0.004");
    const TERMINAL_NO_FILL_STATUSES = ["CANCELLED", "DISCARDED", "EXPIRED"];

    const existingOrder = await CoinswitchOrder.findOne({ orderId });

    // The order document may already contain the latest cumulative execution
    // quantity (for example, another sync writes it before this handler runs).
    // Trades are the source of truth for how much has actually been accounted
    // for in the portfolio.
    const recordedOrderTrades = await CoinswitchTrade.find({
      orderId,
      isDeleted: false,
    })
      .select("price quantity")
      .lean({ getters: false });

    let prevExecutedQtyDec = new Decimal(0);
    let prevRecordedNotionalDec = new Decimal(0);
    for (const trade of recordedOrderTrades) {
      const recordedQty = new Decimal(trade.quantity ? trade.quantity.toString() : "0")
        .toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
      const recordedPrice = new Decimal(trade.price ? trade.price.toString() : "0");
      prevExecutedQtyDec = prevExecutedQtyDec.plus(recordedQty);
      prevRecordedNotionalDec = prevRecordedNotionalDec.plus(recordedQty.mul(recordedPrice));
    }

    const prevLockedBalance = Number(existingOrder?.lockedBalance || 0);

    const filledQtyDec = new Decimal(String(socketData.z || "0"));
    const orderQtyDec = new Decimal(String(socketData.V || "0"));
    const limitPriceDec = new Decimal(String(socketData.p || "0"));
    const avgFillPriceDec = new Decimal(String(socketData.v || "0"));
    const referencePriceDec = limitPriceDec.greaterThan(0) ? limitPriceDec : avgFillPriceDec;

    console.log("🎂🎂🎂🎂🎂😒😃😉👌👌👌👌😢😂😊❤❤❤", orderQtyDec);

    const remainingQtyDec = Decimal.max(0, orderQtyDec.minus(filledQtyDec));
    const remainingQty = remainingQtyDec.toNumber();

    let lockedAmount = 0;
    let lockedQtyForSell = 0;

    if (!TERMINAL_NO_FILL_STATUSES.includes(socketData.X)) {
      if (isBuy) {
        const amountBeforeFee = remainingQtyDec.mul(referencePriceDec);
        lockedAmount = amountBeforeFee.mul(new Decimal(1).plus(FEE_RATE_DEC)).toDecimalPlaces(4).toNumber();
      } else {
        lockedQtyForSell = remainingQty;
      }
    }

    const updateData = {
      side,
      type: socketData.o,
      symbol,
      price: toDecimal128(socketData.p, 4),
      quantity: toDecimal128(socketData.V, 8),
      executedQty: toDecimal128(filledQtyDec.toString(), 8),
      averagePrice: toDecimal128(socketData.v, 4),
      status: socketData.X,
      exchange: socketData.e,
      createdTime: socketData.O ? new Date(Number(socketData.O)) : undefined,
      updatedTime: socketData.E ? new Date(Number(socketData.E)) : undefined,
      lockedBalance: isBuy ? lockedAmount : lockedQtyForSell,
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const order = await CoinswitchOrder.findOneAndUpdate(
      { orderId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    const deltaQtyDec = filledQtyDec.minus(prevExecutedQtyDec);
    const deltaQtyStr = cleanDecimalString(deltaQtyDec, 8);

    console.log(LINE);
    console.log("STEP 3: EXACT FILL DELTA —", deltaQtyStr);
    console.log(LINE);

    let deltaNotionalDec = new Decimal(0);
    let deltaFillPriceDec = new Decimal(0);
    let feeDec = new Decimal(0);

    if (deltaQtyDec.greaterThan(0)) {
      const newNotionalDec = filledQtyDec.mul(avgFillPriceDec);

      deltaNotionalDec = newNotionalDec.minus(prevRecordedNotionalDec).toDecimalPlaces(4);
      deltaFillPriceDec = deltaQtyDec.greaterThan(0)
        ? deltaNotionalDec.div(deltaQtyDec).toDecimalPlaces(4)
        : new Decimal(0);
      feeDec = deltaNotionalDec.mul(FEE_RATE_DEC).toDecimalPlaces(4);

      let portfolio = await CoinswitchPortfolio.findOne({
        coinswitchAccount: order.coinswitchAccount,
        symbol,
      });

      let realizedPnlDec = new Decimal(0);
      if (!isBuy && portfolio) {
        const avgBuyPriceDec = new Decimal(portfolio.averageBuyPrice ? portfolio.averageBuyPrice.toString() : "0");
        realizedPnlDec = deltaFillPriceDec.minus(avgBuyPriceDec).mul(deltaQtyDec).minus(feeDec).toDecimalPlaces(4);
      }

      // Create trade document
      const tradeDoc = await CoinswitchTrade.create({
        coinswitchAccount: order.coinswitchAccount,
        orderId,
        symbol,
        side,
        price: toDecimal128(deltaFillPriceDec, 4),
        quantity: toDecimal128(deltaQtyStr, 8),
        fee: toDecimal128(feeDec, 4),
        totalAmount: toDecimal128(deltaNotionalDec.plus(feeDec), 4),
        realizedPnl: toDecimal128(realizedPnlDec, 4),
        tradeTime: socketData.E ? new Date(Number(socketData.E)) : new Date(),
      });

      console.log(LINE);
      console.log("STEP 5: TRADE CREATED — ID:", s(tradeDoc._id), "| QTY:", deltaQtyStr);
      console.log(LINE);

      // Ledger Summation for totalQuantity
      const allTrades = await CoinswitchTrade.find({
        coinswitchAccount: order.coinswitchAccount,
        symbol,
        isDeleted: false,
      })
        .select("side quantity tradeTime")
        .sort({ tradeTime: 1 })
        .lean({ getters: false });

      let buyQtyDec = new Decimal(0);
      let sellQtyDec = new Decimal(0);

      allTrades.forEach((t) => {
        const rawQtyStr = t.quantity ? t.quantity.toString() : "0";
        const qtyDec = new Decimal(rawQtyStr).toDecimalPlaces(8, Decimal.ROUND_HALF_UP);

        if (t.side === "BUY") {
          buyQtyDec = buyQtyDec.plus(qtyDec);
        } else if (t.side === "SELL") {
          sellQtyDec = sellQtyDec.plus(qtyDec);
        }
      });

      // console.log("😒✔😢😂😂😘😊😘😘", buyQtyDec)

      const netQtyDec = buyQtyDec.minus(sellQtyDec).toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
      const finalQtyDec = Decimal.max(0, netQtyDec);
      const finalQtyStr = cleanDecimalString(finalQtyDec, 8);

      // console.log("😒✔😢😂😂😘😊😘😘", finalQtyStr)
      // console.log("❤🌹🌹🌹😁😁🎂😜😎😎😎", netQtyDec)

      // console.log(LINE);
      // console.log("STEP 9: RECOMPUTED totalQuantity —", finalQtyStr);
      // console.log(LINE);

      // Calculate totalInvested and averageBuyPrice in memory (No $inc / JS Number arithmetic)
      const currentInvestedDec = new Decimal(portfolio?.totalInvested ? portfolio.totalInvested.toString() : "0");
      let newInvestedDec = currentInvestedDec;

      if (isBuy) {
        newInvestedDec = currentInvestedDec.plus(deltaNotionalDec).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
      } else if (portfolio) {
        const avgBuyPriceDec = new Decimal(portfolio.averageBuyPrice ? portfolio.averageBuyPrice.toString() : "0");
        const investedReduction = avgBuyPriceDec.mul(deltaQtyDec).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
        newInvestedDec = Decimal.max(0, currentInvestedDec.minus(investedReduction));
      }

      const finalAvgBuyPriceDec = isBuy
        ? (finalQtyDec.greaterThan(0)
          ? newInvestedDec.div(finalQtyDec).toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
          : deltaFillPriceDec)
        : new Decimal(portfolio?.averageBuyPrice ? portfolio.averageBuyPrice.toString() : "0");

      // console.log("😒✔😢😂😂😘😊😘😘", finalQtyStr)
      // console.log("❤🌹🌹🌹😁😁🎂😜😎😎😎", toDecimal128(finalQtyStr, 8))

      // SINGLE ATOMIC $SET UPDATE
      await CoinswitchPortfolio.findOneAndUpdate(
        { coinswitchAccount: order.coinswitchAccount, symbol },
        {
          $set: {
            totalQuantity: toDecimal128(finalQtyStr, 8),
            totalInvested: toDecimal128(newInvestedDec, 4),
            averageBuyPrice: toDecimal128(finalAvgBuyPriceDec, 4),
            lastUpdatedAt: new Date(),
            isActive: true,
            isDeleted: false,
          },
        },
        { runSettersOnQuery: true, runValidators: true, new: true, upsert: true }
      );

      // const verifyPortfolio = await CoinswitchPortfolio.findOne({
      //   coinswitchAccount: order.coinswitchAccount,
      //   symbol,
      // });

      // console.log(LINE);
      // console.log("STEP 11: VERIFIED AFTER SAVE — totalQuantity:", s(verifyPortfolio?.totalQuantity));
      // console.log(LINE);
    } else {
      console.log("⚠️ Skipping fill block — deltaQty is NOT > 0.");
    }

    // Reconcile even for repeated RAISED/EXECUTED events. A duplicate event
    // must not add quantity, but it can safely repair a legacy noisy value.
    await reconcilePortfolioQuantity(order.coinswitchAccount, symbol);

    // Wallet Balance Update
    const consumed = isBuy && deltaQtyDec.greaterThan(0) ? (deltaNotionalDec.toNumber() + feeDec.toNumber()) : 0;
    const wallet = await CoinswitchWallet.findOne({ coinswitchAccount: order.coinswitchAccount });

    if (wallet) {
      let free = Number(wallet.freeBalance) || 0;
      let locked = Number(wallet.lockedBalance) || 0;
      let total = Number(wallet.totalBalance) || 0;

      if (isBuy) {
        const lockedDelta = lockedAmount - prevLockedBalance;
        const freeToLockedTransfer = lockedDelta + consumed;

        locked += lockedDelta;
        free -= freeToLockedTransfer;
        total -= consumed;
      } else if (deltaQtyDec.greaterThan(0)) {
        const credit = deltaNotionalDec.toNumber() - feeDec.toNumber();
        free += credit;
        total += credit;
      }

      wallet.freeBalance = Number(Math.max(0, free).toFixed(4));
      wallet.lockedBalance = Number(Math.max(0, locked).toFixed(4));
      wallet.totalBalance = Number(Math.max(0, total).toFixed(4));
      wallet.availableForSpot = wallet.freeBalance;
      wallet.lastUpdatedAt = new Date();
      await wallet.save();
    }

    return order;
  } catch (error) {
    console.error("❌ Error updating Coinswitch Order & Portfolio:", error);
    throw error;
  }
};
*/


const CoinswitchOrder = require("../models/coinswitchModels/coinswitchOrder");
const CoinswitchPortfolio = require("../models/coinswitchModels/coinswitchPortfolio");
const CoinswitchTrade = require("../models/coinswitchModels/coinswitchTrade");
const CoinswitchWallet = require("../models/coinswitchModels/coinswitchWallet");
const { toDecimal128 } = require("../models/pi42Models/decimal");
const Decimal = require("decimal.js");


const FEE_SLABS = [
  { min: new Decimal(0), max: new Decimal(500000), rate: new Decimal("0.40") },
  { min: new Decimal(500000), max: new Decimal(2000000), rate: new Decimal("0.26") },
  { min: new Decimal(2000000), max: new Decimal(5000000), rate: new Decimal("0.24") },
  { min: new Decimal(5000000), max: new Decimal(50000000), rate: new Decimal("0.20") },
  { min: new Decimal(50000000), max: new Decimal(200000000), rate: new Decimal("0.14") },
  { min: new Decimal(200000000), max: new Decimal(500000000), rate: new Decimal("0.12") },
  { min: new Decimal(500000000), max: new Decimal(1000000000), rate: new Decimal("0.08") },
  { min: new Decimal(1000000000), max: new Decimal(3000000000), rate: new Decimal("0.06") },
  { min: new Decimal(3000000000), max: new Decimal(50000000000), rate: new Decimal("0.04") },
];

const getFeeRateDec = (notionalDec) => {
  for (const slab of FEE_SLABS) {
    if (notionalDec.greaterThanOrEqualTo(slab.min) && notionalDec.lessThan(slab.max)) {
      return slab.rate.div(100);
    }
  }
  // Above the last slab's max — fall back to the lowest (last) rate.
  return FEE_SLABS[FEE_SLABS.length - 1].rate.div(100);
};

// All financial math uses Decimal.js (arbitrary-precision, string-based).
// socketData values are parsed directly from their STRING form into Decimal
// — JS Number is never used for price/quantity/notional arithmetic, so
// binary floating-point noise (e.g. 0.000029999999999999997 or
// 0.00014000000000000001) can never enter the calculation at all.
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

// Reads a Decimal128 (or already-string) field back as a Decimal — never
// goes through JS Number, so no precision is lost on the round trip.
const readDec = (field) => new Decimal(field ? field.toString() : "0");

exports.updateCoinswitchOrder = async (socketData) => {
  try {
    const orderId = socketData.i;
    const rawSymbol = socketData.s.toUpperCase();        // XRPINR
    const symbol = rawSymbol.replace("INR", "/INR");     // XRP/INR
    const side = socketData.S; // BUY / SELL
    const isBuy = side === "BUY";

    // const FEE_RATE_DEC = new Decimal("0.004"); // 0.4%
    const TERMINAL_NO_FILL_STATUSES = ["CANCELLED", "DISCARDED", "EXPIRED"];

    const existingOrder = await CoinswitchOrder.findOne({ orderId });

    const prevExecutedQtyDec = readDec(existingOrder?.executedQty);
    const prevAvgPriceDec = readDec(existingOrder?.averagePrice);
    const prevLockedBalance = Number(existingOrder?.lockedBalance || 0); // plain Number field, not Decimal128

    const orderQtyDec = new Decimal(String(socketData.V || "0")); // actual order quantity
    const filledQtyDec = new Decimal(String(socketData.z || "0"));
    const limitPriceDec = new Decimal(String(socketData.p || "0")); // limit price
    const avgFillPriceDec = new Decimal(String(socketData.v || "0"));
    const referencePriceDec = limitPriceDec.greaterThan(0) ? limitPriceDec : avgFillPriceDec;

    // fee calculation
    const orderNotionalDec = orderQtyDec.mul(limitPriceDec);
    const FEE_RATE_DEC = getFeeRateDec(orderNotionalDec);


    const remainingQtyDec = Decimal.max(0, orderQtyDec.minus(filledQtyDec));

    // ==================== LOCKED BALANCE (for the Order doc) ====================
    let lockedAmount = 0;      // INR, BUY only (plain Number field on Order)
    let lockedQtyForSell = 0;  // base-asset qty, SELL only

    if (!TERMINAL_NO_FILL_STATUSES.includes(socketData.X)) {
      if (isBuy) {
        const amountBeforeFee = remainingQtyDec.mul(referencePriceDec);
        lockedAmount = amountBeforeFee.mul(new Decimal(1).plus(FEE_RATE_DEC)).toDecimalPlaces(4).toNumber();
      } else {
        lockedQtyForSell = remainingQtyDec.toNumber();
      }
    }

    // ==================== UPDATE ORDER ====================
    const updateData = {
      side,
      type: socketData.o,
      symbol,
      price: toDecimal128(socketData.p, 4),
      quantity: toDecimal128(socketData.V, 8),
      executedQty: toDecimal128(socketData.z, 8),
      averagePrice: toDecimal128(socketData.v, 4),
      status: socketData.X,
      exchange: socketData.e,
      createdTime: socketData.O ? new Date(Number(socketData.O)) : undefined,
      updatedTime: socketData.E ? new Date(Number(socketData.E)) : undefined,
      lockedBalance: isBuy ? lockedAmount : lockedQtyForSell,
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const order = await CoinswitchOrder.findOneAndUpdate(
      { orderId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    // ==================== FILL DELTA ====================
    // z is cumulative — only the NEW fill (this event) matters downstream.
    // Decimal subtraction here is exact by construction — no rounding
    // needed to "clean up" noise, because no noise was ever introduced.
    const deltaQtyDec = filledQtyDec.minus(prevExecutedQtyDec);

    let deltaNotionalDec = new Decimal(0);
    let deltaFillPriceDec = new Decimal(0);
    let feeDec = new Decimal(0);

    if (deltaQtyDec.greaterThan(0)) {
      const prevNotionalDec = prevExecutedQtyDec.mul(prevAvgPriceDec);
      const newNotionalDec = filledQtyDec.mul(avgFillPriceDec);

      deltaNotionalDec = newNotionalDec.minus(prevNotionalDec).toDecimalPlaces(4);
      deltaFillPriceDec = deltaNotionalDec.div(deltaQtyDec).toDecimalPlaces(4);
      feeDec = deltaNotionalDec.mul(FEE_RATE_DEC).toDecimalPlaces(4);

      let portfolio = await CoinswitchPortfolio.findOne({
        coinswitchAccount: order.coinswitchAccount,
        symbol,
      });

      let realizedPnlDec = new Decimal(0);
      if (!isBuy && portfolio) {
        const avgBuyPriceDec = readDec(portfolio.averageBuyPrice);
        realizedPnlDec = deltaFillPriceDec.minus(avgBuyPriceDec).mul(deltaQtyDec).minus(feeDec).toDecimalPlaces(4);
      }

      // === Trade record (incremental fill only) ===
      await CoinswitchTrade.create({
        coinswitchAccount: order.coinswitchAccount,
        orderId,
        symbol,
        side,
        price: toDecimal128(deltaFillPriceDec, 4),
        quantity: toDecimal128(deltaQtyDec, 8),
        fee: toDecimal128(feeDec, 4),
        totalAmount: toDecimal128(deltaNotionalDec.plus(feeDec), 4),
        realizedPnl: toDecimal128(realizedPnlDec, 4),
        tradeTime: socketData.E ? new Date(Number(socketData.E)) : new Date(),
      });

      // ==================== Portfolio update ====================
      // toDecimal128 builds the increment string via Decimal.toFixed(),
      // which is always plain fixed-point (never "1e-8" scientific
      // notation like String(v) could produce for small quantities).
      const deltaQty128 = toDecimal128(deltaQtyDec, 8);
      const deltaNotional128 = toDecimal128(deltaNotionalDec, 4);

      if (isBuy) {
        const updatedPortfolio = await CoinswitchPortfolio.findOneAndUpdate(
          { coinswitchAccount: order.coinswitchAccount, symbol },
          {
            $inc: {
              totalQuantity: deltaQty128,
              totalInvested: deltaNotional128,
            },
            $set: { lastUpdatedAt: new Date() },
            $setOnInsert: { isActive: true, isDeleted: false },
          },
          { new: true, upsert: true }
        );

        const newQtyDec = readDec(updatedPortfolio.totalQuantity).toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
        const newInvestedDec = readDec(updatedPortfolio.totalInvested).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
        const newAvgBuyPriceDec = newQtyDec.greaterThan(0)
          ? newInvestedDec.div(newQtyDec).toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
          : deltaFillPriceDec;

        updatedPortfolio.totalQuantity = toDecimal128(newQtyDec, 8);
        updatedPortfolio.totalInvested = toDecimal128(newInvestedDec, 4);
        updatedPortfolio.averageBuyPrice = toDecimal128(newAvgBuyPriceDec, 4);
        await updatedPortfolio.save();
      } else if (portfolio) {
        const avgBuyPriceDec = readDec(portfolio.averageBuyPrice);
        const investedReduction128 = toDecimal128(avgBuyPriceDec.mul(deltaQtyDec).toDecimalPlaces(4), 4);

        const updatedPortfolio = await CoinswitchPortfolio.findOneAndUpdate(
          { coinswitchAccount: order.coinswitchAccount, symbol },
          {
            $inc: {
              totalQuantity: toDecimal128(deltaQtyDec.neg(), 8),
              totalInvested: toDecimal128(avgBuyPriceDec.mul(deltaQtyDec).neg().toDecimalPlaces(4), 4),
            },
            $set: { lastUpdatedAt: new Date() },
          },
          { new: true }
        );

        if (updatedPortfolio) {
          const cleanQtyDec = Decimal.max(0, readDec(updatedPortfolio.totalQuantity)).toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
          const cleanInvestedDec = Decimal.max(0, readDec(updatedPortfolio.totalInvested)).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
          updatedPortfolio.totalQuantity = toDecimal128(cleanQtyDec, 8);
          updatedPortfolio.totalInvested = toDecimal128(cleanInvestedDec, 4);
          await updatedPortfolio.save();
        }
      }
    }

    // ==================== WALLET UPDATE (runs on EVERY event) ====================
    const consumed = isBuy && deltaQtyDec.greaterThan(0)
      ? deltaNotionalDec.plus(feeDec)
      : new Decimal(0);

    const wallet = await CoinswitchWallet.findOne({ coinswitchAccount: order.coinswitchAccount });

    if (wallet) {
      let freeDec = readDec(wallet.freeBalance);
      let lockedDec = readDec(wallet.lockedBalance);
      let totalDec = readDec(wallet.totalBalance);

      if (isBuy) {
        const lockedDeltaDec = new Decimal(lockedAmount).minus(prevLockedBalance);
        const freeToLockedTransferDec = lockedDeltaDec.plus(consumed);

        lockedDec = lockedDec.plus(lockedDeltaDec);
        freeDec = freeDec.minus(freeToLockedTransferDec);
        totalDec = totalDec.minus(consumed);
      } else if (deltaQtyDec.greaterThan(0)) {
        const creditDec = deltaNotionalDec.minus(feeDec);
        freeDec = freeDec.plus(creditDec);
        totalDec = totalDec.plus(creditDec);
      }

      wallet.freeBalance = Decimal.max(0, freeDec).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
      wallet.lockedBalance = Decimal.max(0, lockedDec).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
      wallet.totalBalance = Decimal.max(0, totalDec).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber();
      wallet.availableForSpot = wallet.freeBalance;
      wallet.lastUpdatedAt = new Date();
      await wallet.save();
    }

    return order;
  } catch (error) {
    console.error("❌ Error updating Coinswitch Order & Portfolio:", error);
    throw error;
  }
};