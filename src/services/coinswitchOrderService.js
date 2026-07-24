const CoinswitchOrder = require("../models/coinswitchModels/coinswitchOrder");
const CoinswitchPortfolio = require("../models/coinswitchModels/coinswitchPortfolio");
const CoinswitchTrade = require("../models/coinswitchModels/coinswitchTrade");
const CoinswitchWallet = require("../models/coinswitchModels/coinswitchWallet");
const { toDecimal128 } = require("../models/pi42Models/decimal");


const round4 = (num) => Number((Number(num) || 0).toFixed(4));


// exports.updateCoinswitchOrder11 = async (socketData) => {
//   try {
//     const orderId = socketData.i;
//     const rawSymbol = socketData.s.toUpperCase();        // XRPINR
//     const symbol = rawSymbol.replace("INR", "/INR");     // XRP/INR
//     const side = socketData.S; // BUY / SELL
//     const isBuy = side === "BUY";

//     const FEE_RATE = 0.004; // 0.4%
//     const TERMINAL_NO_FILL_STATUSES = ["CANCELLED", "DISCARDED", "EXPIRED"];

//     // Fetch existing order BEFORE overwriting — needed for all deltas.
//     const existingOrder = await CoinswitchOrder.findOne({ orderId });

//     const prevExecutedQty = Number(existingOrder?.executedQty || 0);
//     const prevAvgPrice = Number(existingOrder?.averagePrice || 0);
//     const prevLockedBalance = Number(existingOrder?.lockedBalance || 0);

//     // Number() BEFORE || fallback — "0" is a truthy string.
//     const orderQty = Number(socketData.V || 0);
//     const filledQty = Number(socketData.z || 0);
//     const limitPrice = Number(socketData.p) || 0;
//     const avgFillPrice = Number(socketData.v) || 0;
//     const referencePrice = limitPrice || avgFillPrice || 0;

//     const remainingQty = Math.max(0, orderQty - filledQty);

//     // ==================== LOCKED BALANCE (for the Order doc) ====================
//     // BUY  -> INR reserved for the unfilled remainder (+ estimated fee)
//     // SELL -> base-asset qty still reserved (not INR — tracked here for visibility only)
//     // Terminal-no-fill / fully-executed -> 0 (nothing left to reserve)
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

//     // ==================== FILL DELTA (works for any status, not just EXECUTED/PARTIALLY_EXECUTED) ====================
//     const deltaQty = filledQty - prevExecutedQty; // z is cumulative — only the NEW fill matters

//     let deltaNotional = 0;
//     let deltaFillPrice = 0;
//     let fee = 0;

//     if (deltaQty > 0) {
//       const prevNotional = prevExecutedQty * prevAvgPrice;
//       const newNotional = filledQty * avgFillPrice;
//       deltaNotional = newNotional - prevNotional;
//       deltaFillPrice = deltaNotional / deltaQty;
//       fee = deltaNotional * FEE_RATE;

//       // === Trade record (incremental fill only) ===
//       await CoinswitchTrade.create({
//         coinswitchAccount: order.coinswitchAccount,
//         orderId,
//         symbol,
//         side,
//         price: toDecimal128(deltaFillPrice),
//         quantity: toDecimal128(deltaQty),
//         fee: toDecimal128(fee),
//         totalAmount: toDecimal128(deltaNotional + fee),
//         tradeTime: socketData.E ? new Date(Number(socketData.E)) : new Date(),
//       });

//       // === Portfolio update ===
//       let portfolio = await CoinswitchPortfolio.findOne({
//         coinswitchAccount: order.coinswitchAccount,
//         symbol,
//       });

//       if (isBuy) {
//         if (!portfolio) {
//           portfolio = new CoinswitchPortfolio({
//             coinswitchAccount: order.coinswitchAccount,
//             symbol,
//             totalQuantity: deltaQty,
//             averageBuyPrice: deltaFillPrice,
//             totalInvested: deltaNotional,
//           });
//         } else {
//           const oldQty = Number(portfolio.totalQuantity) || 0;
//           const oldInvested = Number(portfolio.totalInvested) || 0;
//           const newQty = oldQty + deltaQty;
//           const newInvested = oldInvested + deltaNotional;

//           portfolio.totalQuantity = newQty;
//           portfolio.totalInvested = newInvested;
//           portfolio.averageBuyPrice = newQty > 0 ? newInvested / newQty : deltaFillPrice;
//         }
//       } else if (portfolio) {
//         const currentQty = Number(portfolio.totalQuantity) || 0;
//         portfolio.totalQuantity = Math.max(0, currentQty - deltaQty);
//       }

//       if (portfolio) {
//         portfolio.lastUpdatedAt = new Date();
//         await portfolio.save();
//       }
//     }

//     // ==================== WALLET UPDATE (runs on EVERY event — OPEN, PARTIAL, EXECUTED, CANCELLED...) ====================
//     // consumed = INR that permanently leaves the wallet this event because it was
//     // actually spent buying crypto (only relevant for BUY fills).
//     const consumed = isBuy && deltaQty > 0 ? (deltaNotional + fee) : 0;

//     const wallet = await CoinswitchWallet.findOne({ coinswitchAccount: order.coinswitchAccount });

//     if (wallet) {
//       let free = Number(wallet.freeBalance) || 0;
//       let locked = Number(wallet.lockedBalance) || 0;
//       let total = Number(wallet.totalBalance) || 0;

//       if (isBuy) {
//         // How much this order's contribution to "locked" changed since last event.
//         // + on OPEN (new reservation), - on fill (consumed) and on cancel/expire (released).
//         const lockedDelta = lockedAmount - prevLockedBalance;

//         // Strip out the "spent" portion to get the pure free<->locked movement.
//         const freeToLockedTransfer = lockedDelta + consumed;

//         locked += lockedDelta;
//         free -= freeToLockedTransfer;
//         total -= consumed; // only actual spend reduces total; locking/releasing doesn't
//       } else if (deltaQty > 0) {
//         // SELL fill: proceeds arrive fresh into the wallet. Nothing was locked for SELL,
//         // so lockedBalance is untouched here.
//         const credit = deltaNotional - fee;
//         free += credit;
//         total += credit;
//       }

//       // Round to 4 decimals BEFORE writing, so Decimal128 never stores
//       // long floating-point noise (e.g. 123.45670000000001).
//       wallet.freeBalance = round4(Math.max(0, free));
//       wallet.lockedBalance = round4(Math.max(0, locked));
//       wallet.totalBalance = round4(Math.max(0, total));
//       wallet.availableForSpot = wallet.freeBalance; // always equal, per your rule
//       wallet.lastUpdatedAt = new Date();
//       await wallet.save();
//     }

//     return order;
//   } catch (error) {
//     console.error("❌ Error updating Coinswitch Order & Portfolio:", error);
//     throw error;
//   }
// };

exports.updateCoinswitchOrder11 = async (socketData) => {
  try {
    const orderId = socketData.i;
    const rawSymbol = socketData.s.toUpperCase();        // XRPINR
    const symbol = rawSymbol.replace("INR", "/INR");     // XRP/INR
    const side = socketData.S; // BUY / SELL
    const isBuy = side === "BUY";

    const FEE_RATE = 0.004; // 0.4%
    const TERMINAL_NO_FILL_STATUSES = ["CANCELLED", "DISCARDED", "EXPIRED"];

    // Fetch existing order BEFORE overwriting — needed for all deltas.
    const existingOrder = await CoinswitchOrder.findOne({ orderId });

    const prevExecutedQty = Number(existingOrder?.executedQty || 0);
    const prevAvgPrice = Number(existingOrder?.averagePrice || 0);
    const prevLockedBalance = Number(existingOrder?.lockedBalance || 0);

    // Number() BEFORE || fallback — "0" is a truthy string.
    const orderQty = Number(socketData.V || 0);
    const filledQty = Number(socketData.z || 0);
    const limitPrice = Number(socketData.p) || 0;
    const avgFillPrice = Number(socketData.v) || 0;
    const referencePrice = limitPrice || avgFillPrice || 0;

    const remainingQty = Math.max(0, orderQty - filledQty);

    // ==================== LOCKED BALANCE (for the Order doc) ====================
    // BUY  -> INR reserved for the unfilled remainder (+ estimated fee)
    // SELL -> base-asset qty still reserved (not INR — tracked here for visibility only)
    // Terminal-no-fill / fully-executed -> 0 (nothing left to reserve)
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

    // ==================== FILL DELTA (works for any status, not just EXECUTED/PARTIALLY_EXECUTED) ====================
    const deltaQty = filledQty - prevExecutedQty; // z is cumulative — only the NEW fill matters

    let deltaNotional = 0;
    let deltaFillPrice = 0;
    let fee = 0;

    if (deltaQty > 0) {
      const prevNotional = prevExecutedQty * prevAvgPrice;
      const newNotional = filledQty * avgFillPrice;
      deltaNotional = newNotional - prevNotional;
      deltaFillPrice = deltaNotional / deltaQty;
      fee = deltaNotional * FEE_RATE;

      // === Fetch Portfolio FIRST — needed to compute realizedPnl for SELL
      // before we create the Trade record, and to update holdings after. ===
      let portfolio = await CoinswitchPortfolio.findOne({
        coinswitchAccount: order.coinswitchAccount,
        symbol,
      });

      // === realizedPnl (SELL only): (sell price - avg buy price) * qty sold, minus this fill's fee ===
      let realizedPnl = 0;
      if (!isBuy && portfolio) {
        const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;
        realizedPnl = (deltaFillPrice - avgBuyPrice) * deltaQty - fee;
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
        totalAmount: toDecimal128(deltaNotional + fee),
        realizedPnl: toDecimal128(round4(realizedPnl)),
        tradeTime: socketData.E ? new Date(Number(socketData.E)) : new Date(),
      });

      // === Portfolio update ===
      if (isBuy) {
        if (!portfolio) {
          portfolio = new CoinswitchPortfolio({
            coinswitchAccount: order.coinswitchAccount,
            symbol,
            totalQuantity: deltaQty,
            averageBuyPrice: deltaFillPrice,
            totalInvested: deltaNotional,
          });
        } else {
          const oldQty = Number(portfolio.totalQuantity) || 0;
          const oldInvested = Number(portfolio.totalInvested) || 0;
          const newQty = oldQty + deltaQty;
          const newInvested = oldInvested + deltaNotional;

          portfolio.totalQuantity = newQty;
          portfolio.totalInvested = newInvested;
          portfolio.averageBuyPrice = newQty > 0 ? newInvested / newQty : deltaFillPrice;
        }
      } else if (portfolio) {
        const currentQty = Number(portfolio.totalQuantity) || 0;
        const oldInvested = Number(portfolio.totalInvested) || 0;
        const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;

        const newQty = Math.max(0, currentQty - deltaQty);
        // Reduce totalInvested proportionally to the qty sold, so averageBuyPrice
        // stays correct for whatever's left in the portfolio.
        portfolio.totalQuantity = newQty;
        portfolio.totalInvested = Math.max(0, oldInvested - avgBuyPrice * deltaQty);
      }

      if (portfolio) {
        portfolio.lastUpdatedAt = new Date();
        await portfolio.save();
      }
    }

    // ==================== WALLET UPDATE (runs on EVERY event — OPEN, PARTIAL, EXECUTED, CANCELLED...) ====================
    // consumed = INR that permanently leaves the wallet this event because it was
    // actually spent buying crypto (only relevant for BUY fills).
    const consumed = isBuy && deltaQty > 0 ? (deltaNotional + fee) : 0;

    const wallet = await CoinswitchWallet.findOne({ coinswitchAccount: order.coinswitchAccount });

    if (wallet) {
      let free = Number(wallet.freeBalance) || 0;
      let locked = Number(wallet.lockedBalance) || 0;
      let total = Number(wallet.totalBalance) || 0;

      if (isBuy) {
        // How much this order's contribution to "locked" changed since last event.
        // + on OPEN (new reservation), - on fill (consumed) and on cancel/expire (released).
        const lockedDelta = lockedAmount - prevLockedBalance;

        // Strip out the "spent" portion to get the pure free<->locked movement.
        const freeToLockedTransfer = lockedDelta + consumed;

        locked += lockedDelta;
        free -= freeToLockedTransfer;
        total -= consumed; // only actual spend reduces total; locking/releasing doesn't
      } else if (deltaQty > 0) {
        // SELL fill: proceeds arrive fresh into the wallet. Nothing was locked for SELL,
        // so lockedBalance is untouched here.
        const credit = deltaNotional - fee;
        free += credit;
        total += credit;
      }

      // Round to 4 decimals BEFORE writing, so Decimal128 never stores
      // long floating-point noise (e.g. 123.45670000000001).
      wallet.freeBalance = round4(Math.max(0, free));
      wallet.lockedBalance = round4(Math.max(0, locked));
      wallet.totalBalance = round4(Math.max(0, total));
      wallet.availableForSpot = wallet.freeBalance; // always equal, per your rule
      wallet.lastUpdatedAt = new Date();
      await wallet.save();
    }

    return order;
  } catch (error) {
    console.error("❌ Error updating Coinswitch Order & Portfolio:", error);
    throw error;
  }
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

    // Fetch existing order BEFORE overwriting — needed for all deltas.
    const existingOrder = await CoinswitchOrder.findOne({ orderId });

    const prevExecutedQty = Number(existingOrder?.executedQty || 0);
    const prevAvgPrice = Number(existingOrder?.averagePrice || 0);
    const prevLockedBalance = Number(existingOrder?.lockedBalance || 0);

    // Number() BEFORE || fallback — "0" is a truthy string.
    const orderQty = Number(socketData.V || 0);
    const filledQty = Number(socketData.z || 0);
    const limitPrice = Number(socketData.p) || 0;
    const avgFillPrice = Number(socketData.v) || 0;
    const referencePrice = limitPrice || avgFillPrice || 0;

    const remainingQty = Math.max(0, orderQty - filledQty);

    // ==================== LOCKED BALANCE (for the Order doc) ====================
    // BUY  -> INR reserved for the unfilled remainder (+ estimated fee)
    // SELL -> base-asset qty still reserved (not INR — tracked here for visibility only)
    // Terminal-no-fill / fully-executed -> 0 (nothing left to reserve)
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

    // ==================== FILL DELTA (works for any status, not just EXECUTED/PARTIALLY_EXECUTED) ====================
    const deltaQty = filledQty - prevExecutedQty; // z is cumulative — only the NEW fill matters

    let deltaNotional = 0;
    let deltaFillPrice = 0;
    let fee = 0;

    if (deltaQty > 0) {
      const prevNotional = prevExecutedQty * prevAvgPrice;
      const newNotional = filledQty * avgFillPrice;
      deltaNotional = newNotional - prevNotional;
      deltaFillPrice = deltaNotional / deltaQty;
      fee = deltaNotional * FEE_RATE;

      // === Fetch Portfolio FIRST — needed to compute realizedPnl for SELL
      // before we create the Trade record, and to update holdings after. ===
      let portfolio = await CoinswitchPortfolio.findOne({
        coinswitchAccount: order.coinswitchAccount,
        symbol,
      });

      // === realizedPnl (SELL only): (sell price - avg buy price) * qty sold, minus this fill's fee ===
      let realizedPnl = 0;
      if (!isBuy && portfolio) {
        const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;
        realizedPnl = (deltaFillPrice - avgBuyPrice) * deltaQty - fee;
      }

      // === Trade record (incremental fill only) ===
      await CoinswitchTrade.create({
        coinswitchAccount: order.coinswitchAccount,
        orderId,
        symbol,
        side,
        price: toDecimal128(round4(deltaFillPrice)),
        quantity: toDecimal128(deltaQty),
        fee: toDecimal128(round4(fee)),
        totalAmount: toDecimal128(round4(deltaNotional + fee)),
        realizedPnl: toDecimal128(round4(realizedPnl)),
        tradeTime: socketData.E ? new Date(Number(socketData.E)) : new Date(),
      });

      // === Portfolio update ===
      if (isBuy) {
        if (!portfolio) {
          portfolio = new CoinswitchPortfolio({
            coinswitchAccount: order.coinswitchAccount,
            symbol,
            totalQuantity: deltaQty,
            averageBuyPrice: round4(deltaFillPrice),
            totalInvested: round4(deltaNotional),
          });
        } else {
          const oldQty = Number(portfolio.totalQuantity) || 0;
          const oldInvested = Number(portfolio.totalInvested) || 0;
          const newQty = oldQty + deltaQty;
          const newInvested = oldInvested + deltaNotional;

          portfolio.totalQuantity = newQty;
          portfolio.totalInvested = round4(newInvested);
          portfolio.averageBuyPrice = round4(newQty > 0 ? newInvested / newQty : deltaFillPrice);
        }
      } else if (portfolio) {
        const currentQty = Number(portfolio.totalQuantity) || 0;
        const oldInvested = Number(portfolio.totalInvested) || 0;
        const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;

        const newQty = Math.max(0, currentQty - deltaQty);
        // Reduce totalInvested proportionally to the qty sold, so averageBuyPrice
        // stays correct for whatever's left in the portfolio.
        portfolio.totalQuantity = newQty;
        portfolio.totalInvested = round4(Math.max(0, oldInvested - avgBuyPrice * deltaQty));
      }

      if (portfolio) {
        portfolio.lastUpdatedAt = new Date();
        await portfolio.save();
      }
    }

    // ==================== WALLET UPDATE (runs on EVERY event — OPEN, PARTIAL, EXECUTED, CANCELLED...) ====================
    // consumed = INR that permanently leaves the wallet this event because it was
    // actually spent buying crypto (only relevant for BUY fills).
    const consumed = isBuy && deltaQty > 0 ? (deltaNotional + fee) : 0;

    const wallet = await CoinswitchWallet.findOne({ coinswitchAccount: order.coinswitchAccount });

    if (wallet) {
      let free = Number(wallet.freeBalance) || 0;
      let locked = Number(wallet.lockedBalance) || 0;
      let total = Number(wallet.totalBalance) || 0;

      if (isBuy) {
        // How much this order's contribution to "locked" changed since last event.
        // + on OPEN (new reservation), - on fill (consumed) and on cancel/expire (released).
        const lockedDelta = lockedAmount - prevLockedBalance;

        // Strip out the "spent" portion to get the pure free<->locked movement.
        const freeToLockedTransfer = lockedDelta + consumed;

        locked += lockedDelta;
        free -= freeToLockedTransfer;
        total -= consumed; // only actual spend reduces total; locking/releasing doesn't
      } else if (deltaQty > 0) {
        // SELL fill: proceeds arrive fresh into the wallet. Nothing was locked for SELL,
        // so lockedBalance is untouched here.
        const credit = deltaNotional - fee;
        free += credit;
        total += credit;
      }

      // Round to 4 decimals BEFORE writing, so Decimal128 never stores
      // long floating-point noise (e.g. 123.45670000000001).
      wallet.freeBalance = round4(Math.max(0, free));
      wallet.lockedBalance = round4(Math.max(0, locked));
      wallet.totalBalance = round4(Math.max(0, total));
      wallet.availableForSpot = wallet.freeBalance; // always equal, per your rule
      wallet.lastUpdatedAt = new Date();
      await wallet.save();
    }

    return order;
  } catch (error) {
    console.error("❌ Error updating Coinswitch Order & Portfolio:", error);
    throw error;
  }
};






exports.updateCoinswitchOrderNew = async (socketData) => {
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
    const prevLockedBalance = Number(existingOrder?.lockedBalance || 0); // INR for BUY, qty for SELL

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
    // NOTE: when status is CANCELLED/DISCARDED/EXPIRED, both lockedAmount and
    // lockedQtyForSell resolve to 0 — this is what triggers the release below.

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

    // ==================== PORTFOLIO (single fetch, used by both the locked-qty sync below and the fill block) ====================
    let portfolio = await CoinswitchPortfolio.findOne({
      coinswitchAccount: order.coinswitchAccount,
      symbol,
    });

    // === SELL: sync reserved/locked quantity on EVERY event (OPEN, PARTIAL, CANCELLED...) ===
    // prevLockedBalance (SELL) = qty this order had reserved before this event.
    // lockedQtyForSell = qty this order should have reserved now.
    // Delta handles all cases: OPEN -> +reserve, CANCELLED/EXPIRED -> -release to 0,
    // PARTIALLY_EXECUTED -> the reserved amount shrinks as remainingQty shrinks.
    if (!isBuy && portfolio) {
      const lockedQtyDelta = lockedQtyForSell - prevLockedBalance;
      const currentLocked = Number(portfolio.lockedQuantity) || 0;
      portfolio.lockedQuantity = Math.max(0, currentLocked + lockedQtyDelta);
    }

    // ==================== FILL DELTA ====================
    const deltaQty = filledQty - prevExecutedQty; // z is cumulative — only the NEW fill matters

    let deltaNotional = 0;
    let deltaFillPrice = 0;
    let fee = 0;

    if (deltaQty > 0) {
      const prevNotional = prevExecutedQty * prevAvgPrice;
      const newNotional = filledQty * avgFillPrice;
      deltaNotional = newNotional - prevNotional;
      deltaFillPrice = deltaNotional / deltaQty;
      fee = deltaNotional * FEE_RATE;

      let realizedPnl = 0;
      if (!isBuy && portfolio) {
        const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;
        realizedPnl = (deltaFillPrice - avgBuyPrice) * deltaQty - fee;
      }

      await CoinswitchTrade.create({
        coinswitchAccount: order.coinswitchAccount,
        orderId,
        symbol,
        side,
        price: toDecimal128(round4(deltaFillPrice)),
        quantity: toDecimal128(deltaQty),
        fee: toDecimal128(round4(fee)),
        totalAmount: toDecimal128(round4(deltaNotional + fee)),
        realizedPnl: toDecimal128(round4(realizedPnl)),
        tradeTime: socketData.E ? new Date(Number(socketData.E)) : new Date(),
      });

      if (isBuy) {
        if (!portfolio) {
          portfolio = new CoinswitchPortfolio({
            coinswitchAccount: order.coinswitchAccount,
            symbol,
            totalQuantity: deltaQty,
            averageBuyPrice: round4(deltaFillPrice),
            totalInvested: round4(deltaNotional),
          });
        } else {
          const oldQty = Number(portfolio.totalQuantity) || 0;
          const oldInvested = Number(portfolio.totalInvested) || 0;
          const newQty = oldQty + deltaQty;
          const newInvested = oldInvested + deltaNotional;

          portfolio.totalQuantity = newQty;
          portfolio.totalInvested = round4(newInvested);
          portfolio.averageBuyPrice = round4(newQty > 0 ? newInvested / newQty : deltaFillPrice);
        }
      } else if (portfolio) {
        const currentQty = Number(portfolio.totalQuantity) || 0;
        const oldInvested = Number(portfolio.totalInvested) || 0;
        const avgBuyPrice = Number(portfolio.averageBuyPrice) || 0;

        const newQty = Math.max(0, currentQty - deltaQty);
        portfolio.totalQuantity = newQty;
        portfolio.totalInvested = round4(Math.max(0, oldInvested - avgBuyPrice * deltaQty));
      }
    }

    if (portfolio) {
      portfolio.lastUpdatedAt = new Date();
      await portfolio.save();
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