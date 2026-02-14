const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../utils/decimals");

const futuresPositionSchema = new Schema(
  {
    // 🔹 Ownership
    subAccountId: {
      type: Schema.Types.ObjectId,
      ref: "SubAccount",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🔹 Market
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },

    positionSide: {
      type: String,
      enum: ["LONG", "SHORT"],
      required: true,
    },

    // 🔹 Core Position
    quantity: D(), // always positive

    entryPrice: D(),

    markPrice: D(),

    lastPrice: D(), // ✅ NEW - Latest trade price

    leverage: {
      type: Number,
      required: true,
      min: 1,
      max: 125,
    },

    marginMode: {
      type: String,
      enum: ["ISOLATED", "CROSS"],
      default: "ISOLATED",
    },

    // 🔹 Margin
    initialMargin: D(),

    margin: D(), // Current margin (can change due to add/remove margin)

    maintenanceMargin: D(),

    isolatedWalletBalance: D(), // important for isolated mode

    marginRatio: D(), // ✅ NEW - maintenanceMargin / margin (for risk alerts)

    // 🔹 PnL
    unrealizedPnl: D(),

    unrealizedPnlPercentage: D(), // ✅ NEW - PnL as % of margin

    realizedPnl: D(),

    fundingFeeAccrued: D(),

    totalFeesPaid: D(), // ✅ NEW - All fees (trading + funding)

    // 🔹 Risk
    liquidationPrice: D(),

    bankruptcyPrice: D(),

    riskLevel: { // ✅ NEW - Risk indicator
      type: String,
      enum: ["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "SAFE",
    },

    autoDeleveragingEligible: {
      type: Boolean,
      default: false,
    },

    adlRanking: { // ✅ NEW - ADL queue position (1-5, 5 = highest risk)
      type: Number,
      min: 1,
      max: 5,
    },

    // 🔹 TP/SL (✅ NEW)
    takeProfitPrice: D(),
    stopLossPrice: D(),

    // Active TP/SL orders
    takeProfitOrderId: {
      type: Schema.Types.ObjectId,
      ref: "FuturesOrder",
    },

    stopLossOrderId: {
      type: Schema.Types.ObjectId,
      ref: "FuturesOrder",
    },

    // 🔹 Position State
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "LIQUIDATED", "ADL_REDUCED"], // ✅ Added ADL_REDUCED
      default: "OPEN",
      index: true,
    },

    // 🔹 Timestamps (✅ NEW)
    openedAt: {
      type: Date,
      default: Date.now,
    },

    closedAt: Date,

    liquidatedAt: Date,

    lastFundingTime: Date, // Last funding fee payment

    // 🔹 Statistics (✅ NEW)
    totalTrades: { // Number of trades that modified this position
      type: Number,
      default: 0,
    },

    averageHoldingTime: Number, // In seconds

    maxUnrealizedPnl: D(), // Highest unrealized profit reached

    maxDrawdown: D(), // Largest unrealized loss reached

    // 🔹 Exchange Mapping
    exchangePositionId: {
      type: String,
      index: true,
      sparse: true,
    },

    // 🔹 Liquidation Details (✅ NEW)
    liquidationDetails: {
      liquidatedBy: String, // "SYSTEM" / "INSURANCE_FUND"
      liquidationPrice: D(),
      totalLoss: D(),
      insuranceFundUsed: D(),
      timestamp: Date,
    },

    // 🔹 Metadata
    meta: {
      initialOrderId: { // First order that opened this position
        type: Schema.Types.ObjectId,
        ref: "FuturesOrder",
      },
      closingOrderId: { // Order that closed the position
        type: Schema.Types.ObjectId,
        ref: "FuturesOrder",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Decimal field getters
[
  "quantity",
  "entryPrice",
  "markPrice",
  "lastPrice",
  "initialMargin",
  "margin",
  "maintenanceMargin",
  "isolatedWalletBalance",
  "marginRatio",
  "unrealizedPnl",
  "unrealizedPnlPercentage",
  "realizedPnl",
  "fundingFeeAccrued",
  "totalFeesPaid",
  "liquidationPrice",
  "bankruptcyPrice",
  "takeProfitPrice",
  "stopLossPrice",
  "maxUnrealizedPnl",
  "maxDrawdown",
  "liquidationDetails.liquidationPrice",
  "liquidationDetails.totalLoss",
  "liquidationDetails.insuranceFundUsed",
].forEach((field) => {
  const path = futuresPositionSchema.path(field);
  if (path) {
    path.get(decimalGetter);
  }
});

// Indexes
futuresPositionSchema.index(
  { subAccountId: 1, symbol: 1, positionSide: 1, status: 1 },
  { unique: true }
); // ✅ Added status to unique index

futuresPositionSchema.index({ userId: 1, status: 1 });
futuresPositionSchema.index({ symbol: 1, status: 1 });
futuresPositionSchema.index({ riskLevel: 1, status: 1 }); // ✅ NEW - Risk monitoring
futuresPositionSchema.index({ marginRatio: 1, status: 1 }); // ✅ NEW - Liquidation scan
futuresPositionSchema.index({ exchangePositionId: 1 });

// Virtual field: Position Value
futuresPositionSchema.virtual("positionValue").get(function () {
  if (!this.quantity || !this.markPrice) return "0";
  const qty = parseFloat(this.quantity);
  const price = parseFloat(this.markPrice);
  return (qty * price).toFixed(8);
});

// Virtual field: ROE (Return on Equity)
futuresPositionSchema.virtual("roe").get(function () {
  if (!this.unrealizedPnl || !this.margin) return "0";
  const pnl = parseFloat(this.unrealizedPnl);
  const margin = parseFloat(this.margin);
  if (margin === 0) return "0";
  return ((pnl / margin) * 100).toFixed(2); // Percentage
});

const FuturesPosition = mongoose.model(
  "FuturesPosition",
  futuresPositionSchema
);

module.exports = FuturesPosition;