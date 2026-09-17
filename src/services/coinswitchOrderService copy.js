const CoinswitchOrder = require("../models/coinswitchModels/coinswitchOrder");
const CoinswitchPortfolio = require("../models/coinswitchModels/coinswitchPortfolio");
const CoinswitchTrade = require("../models/coinswitchModels/coinswitchTrade");
const CoinswitchWallet = require("../models/coinswitchModels/coinswitchWallet");
const { toDecimal128 } = require("../models/pi42Models/decimal");
const mongoose = require("mongoose");

const round4 = (num) => Number((Number(num) || 0).toFixed(4));
const round8 = (num) => Number((Number(num) || 0).toFixed(8));

// IMPORTANT: value passed in here MUST already be rounded (round8) before
// calling this — otherwise binary floating-point noise from earlier JS
// subtraction (e.g. filledQty - prevExecutedQty) gets baked into the
// Decimal128 string and MongoDB's $inc will faithfully add that noise too.
const toDecimalInc = (value, negate = false) => {
  const v = negate ? -value : value;
  return mongoose.Types.Decimal128.fromString(String(v));
};

exports.updateCoinswitchOrder = async (socketData) => {
  try {
    const orderId = socketData.i;
    const rawSymbol = socketData.s.toUpperCase();        // XRPINR
    const symbol = rawSymbol.replace("INR", "/INR");     // XRP/INR
    const side = socketData.S; // BUY / SELL
    const isBuy = side === "BUY";

    const FEE_RATE = 0.004; // 0.4%
    const TERMINAL_NO_FILL_STATUSES = ["CANCELLED", "DISCARDED", "EXPIRED"];

    const existingOrder = await CoinswitchOrder.findOne({ orderId });

    const prevExecutedQty = Number(existingOrder?.executedQty || 0);
    const prevAvgPrice = Number(existingOrder?.averagePrice || 0);
    const prevLockedBalance = Number(existingOrder?.lockedBalance || 0);

    const orderQty = Number(socketData.V || 0);
    const filledQty = Number(socketData.z || 0);
    const limitPrice = Number(socketData.p) || 0;
    const avgFillPrice = Number(socketData.v) || 0;
    const referencePrice = limitPrice || avgFillPrice || 0;

    const remainingQty = Math.max(0, orderQty - filledQty);

    // ==================== LOCKED BALANCE (for the Order doc) ====================
    let lockedAmount = 0;      // INR, BUY only
    let lockedQtyForSell = 0;  // base-asset qty, SELL only

    if (!TERMINAL_NO_FILL_STATUSES.includes(socketData.X)) {
      if (isBuy) {
        const amountBeforeFee = remainingQty * referencePrice;
        lockedAmount = amountBeforeFee * (1 + FEE_RATE);
      } else {
        lockedQtyForSell = remainingQty;
      }
    }

    // ==================== UPDATE ORDER ====================
    const updateData = {
      side,
      type: socketData.o,
      symbol,
      price: toDecimal128(socketData.p),
      quantity: toDecimal128(socketData.V),
      executedQty: toDecimal128(socketData.z),
      averagePrice: toDecimal128(socketData.v),
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
    // Round deltaQty (and its dependent notional/fee values) IMMEDIATELY —
    // this is the critical fix. filledQty - prevExecutedQty is a plain JS
    // float subtraction and can carry binary floating-point noise (e.g.
    // 0.000029999999999999997 instead of clean 0.00003). Every downstream
    // use of deltaQty (Trade record, Portfolio $inc) must use the CLEANED
    // value, or that noise gets written straight into Decimal128 fields.
    const rawDeltaQty = filledQty - prevExecutedQty; // z is cumulative — only the NEW fill matters
    const deltaQty = round8(rawDeltaQty);

    let deltaNotional = 0;
    let deltaFillPrice = 0;
    let fee = 0;

    if (deltaQty > 0) {
      const prevNotional = prevExecutedQty * prevAvgPrice;
      const newNotional = filledQty * avgFillPrice;
      deltaNotional = round4(newNotional - prevNotional);
      deltaFillPrice = round4(deltaQty > 0 ? deltaNotional / deltaQty : 0);
      fee = round4(deltaNotional * FEE_RATE);

      let portfolio = await CoinswitchPortfolio.findOne({
        coinswitchAccount: order.coinswitchAccount,
        symbol,
      });

      let realizedPnl = 0;
      if (!isBuy && portfolio) {
        const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;
        realizedPnl = round4((deltaFillPrice - avgBuyPrice) * deltaQty - fee);
      }

      // === Trade record (incremental fill only) ===
      await CoinswitchTrade.create({
        coinswitchAccount: order.coinswitchAccount,
        orderId,
        symbol,
        side,
        price: toDecimal128(deltaFillPrice),
        quantity: toDecimal128(deltaQty),
        fee: toDecimal128(fee),
        totalAmount: toDecimal128(round4(deltaNotional + fee)),
        realizedPnl: toDecimal128(realizedPnl),
        tradeTime: socketData.E ? new Date(Number(socketData.E)) : new Date(),
      });

      // ==================== Portfolio update ====================
      // deltaQty and deltaNotional are ALREADY clean (round8 / round4 applied
      // above), so the Decimal128 increment MongoDB receives is exact — no
      // noise can be carried into the $inc.
      if (isBuy) {
        const updatedPortfolio = await CoinswitchPortfolio.findOneAndUpdate(
          { coinswitchAccount: order.coinswitchAccount, symbol },
          {
            $inc: {
              totalQuantity: toDecimalInc(deltaQty),
              totalInvested: toDecimalInc(deltaNotional),
            },
            $set: { lastUpdatedAt: new Date() },
            $setOnInsert: { isActive: true, isDeleted: false },
          },
          { new: true, upsert: true }
        );

        const newQty = round8(Number(updatedPortfolio.totalQuantity) || 0);
        const newInvested = round4(Number(updatedPortfolio.totalInvested) || 0);

        updatedPortfolio.totalQuantity = newQty;
        updatedPortfolio.totalInvested = newInvested;
        updatedPortfolio.averageBuyPrice = round4(newQty > 0 ? newInvested / newQty : deltaFillPrice);
        await updatedPortfolio.save();
      } else if (portfolio) {
        const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;
        const investedReduction = round4(avgBuyPrice * deltaQty);

        const updatedPortfolio = await CoinswitchPortfolio.findOneAndUpdate(
          { coinswitchAccount: order.coinswitchAccount, symbol },
          {
            $inc: {
              totalQuantity: toDecimalInc(deltaQty, true),
              totalInvested: toDecimalInc(investedReduction, true),
            },
            $set: { lastUpdatedAt: new Date() },
          },
          { new: true }
        );

        if (updatedPortfolio) {
          const cleanQty = round8(Math.max(0, Number(updatedPortfolio.totalQuantity) || 0));
          const cleanInvested = round4(Math.max(0, Number(updatedPortfolio.totalInvested) || 0));
          updatedPortfolio.totalQuantity = cleanQty;
          updatedPortfolio.totalInvested = cleanInvested;
          await updatedPortfolio.save();
        }
      }
    }

    // ==================== WALLET UPDATE (runs on EVERY event) ====================
    const consumed = isBuy && deltaQty > 0 ? (deltaNotional + fee) : 0;

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
      } else if (deltaQty > 0) {
        const credit = deltaNotional - fee;
        free += credit;
        total += credit;
      }

      wallet.freeBalance = round4(Math.max(0, free));
      wallet.lockedBalance = round4(Math.max(0, locked));
      wallet.totalBalance = round4(Math.max(0, total));
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









/*
const CoinswitchOrder = require("../models/coinswitchModels/coinswitchOrder");
const CoinswitchPortfolio = require("../models/coinswitchModels/coinswitchPortfolio");
const CoinswitchTrade = require("../models/coinswitchModels/coinswitchTrade");
const CoinswitchWallet = require("../models/coinswitchModels/coinswitchWallet");
const { toDecimal128 } = require("../models/pi42Models/decimal");
const Decimal = require("decimal.js");

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

    const FEE_RATE_DEC = new Decimal("0.004"); // 0.4%
    const TERMINAL_NO_FILL_STATUSES = ["CANCELLED", "DISCARDED", "EXPIRED"];

    const existingOrder = await CoinswitchOrder.findOne({ orderId });

    const prevExecutedQtyDec = readDec(existingOrder?.executedQty);
    const prevAvgPriceDec = readDec(existingOrder?.averagePrice);
    const prevLockedBalance = Number(existingOrder?.lockedBalance || 0); // plain Number field, not Decimal128

    const orderQtyDec = new Decimal(String(socketData.V || "0"));
    const filledQtyDec = new Decimal(String(socketData.z || "0"));
    const limitPriceDec = new Decimal(String(socketData.p || "0"));
    const avgFillPriceDec = new Decimal(String(socketData.v || "0"));
    const referencePriceDec = limitPriceDec.greaterThan(0) ? limitPriceDec : avgFillPriceDec;

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
*/