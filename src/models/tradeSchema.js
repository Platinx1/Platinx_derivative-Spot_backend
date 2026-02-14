const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../utils/decimals");

const tradeSchema = new Schema(
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
      required: true, // ✅ Make it required
      index: true,
    },

    marketType: {
      type: String,
      enum: ["SPOT", "FUTURES"],
      required: true,
      index: true,
    },

    symbol: {
      type: String,
      required: true,
      uppercase: true, // ✅ Force uppercase
      index: true,
    },

    // 🔹 Order reference
    orderId: {
      type: Schema.Types.ObjectId,
      // ✅ Dynamic ref based on marketType
      refPath: 'orderModel',
      required: true,
      index: true,
    },

    orderModel: { // ✅ NEW - For polymorphic reference
      type: String,
      enum: ["SpotOrder", "FuturesOrder"],
      required: true,
    },

    clientOrderId: {
      type: String,
      index: true,
    },

    exchangeTradeId: {
      type: String,
      required: true, // ✅ Make it required (every trade must have exchange ID)
      unique: true,   // ✅ Prevent duplicate trades
      index: true,
    },

    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },

    // 🔹 Futures only
    positionSide: {
      type: String,
      enum: ["LONG", "SHORT", null],
    },

    positionId: { // ✅ NEW - Link to position
      type: Schema.Types.ObjectId,
      ref: "FuturesPosition",
      index: true,
    },

    isReduceOnly: {
      type: Boolean,
      default: false,
    },

    // 🔹 Pricing
    price: D(),
    quantity: D(),
    quoteQuantity: D(), // price * quantity

    // 🔹 Fee Breakdown
    exchangeFee: D(),
    platformFee: D(),
    gst: D(),

    feeAsset: {
      type: String,
      default: "USDT",
      uppercase: true,
    },

    // 🔹 PnL (Futures only)
    realizedPnl: D(),

    // 🔹 Commission (✅ NEW - for affiliates/referrals)
    commission: D(),
    commissionAsset: {
      type: String,
      uppercase: true,
    },

    liquidityType: {
      type: String,
      enum: ["MAKER", "TAKER"],
      required: true, // ✅ Make it required
    },

    // 🔹 Execution source
    executionSource: {
      type: String,
      enum: ["INTERNAL", "EXTERNAL"],
      default: "INTERNAL",
    },

    // 🔹 Trade metadata (✅ NEW)
    isSelfTrade: { // When user trades with own order
      type: Boolean,
      default: false,
    },

    tradeRole: { // ✅ NEW - Who initiated the trade
      type: String,
      enum: ["MAKER", "TAKER"],
      required: true,
    },

    // 🔹 Timestamps (✅ NEW)
    executedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // 🔹 Settlement (✅ NEW)
    isSettled: {
      type: Boolean,
      default: false,
      index: true,
    },

    settledAt: Date,

    settlementBatchId: { // For daily settlement processing
      type: Schema.Types.ObjectId,
      ref: "DailySettlement",
      index: true,
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
  "price",
  "quantity",
  "quoteQuantity",
  "exchangeFee",
  "platformFee",
  "gst",
  "realizedPnl",
  "commission",
].forEach((field) => {
  tradeSchema.path(field).get(decimalGetter);
});

// Indexes
tradeSchema.index({ subAccountId: 1, createdAt: -1 });
tradeSchema.index({ userId: 1, createdAt: -1 }); // ✅ NEW - User trade history
tradeSchema.index({ marketType: 1, symbol: 1, createdAt: -1 });
tradeSchema.index({ orderId: 1 });
tradeSchema.index({ positionId: 1 }); // ✅ NEW - Position trades
tradeSchema.index({ exchangeTradeId: 1 }, { unique: true });
tradeSchema.index({ executedAt: 1 }); // ✅ NEW - Time-based queries
tradeSchema.index({ isSettled: 1, createdAt: -1 }); // ✅ NEW - Settlement processing
tradeSchema.index({ liquidityType: 1, marketType: 1 }); // ✅ NEW - Fee analysis

// Compound index for trade matching
tradeSchema.index({ 
  symbol: 1, 
  side: 1, 
  executedAt: -1 
}); // ✅ NEW - Market data queries

// Pre-save hook to set orderModel
tradeSchema.pre('save', function(next) {
  if (!this.orderModel) {
    this.orderModel = this.marketType === "SPOT" ? "SpotOrder" : "FuturesOrder";
  }
  next();
});

const Trade = mongoose.model("Trade", tradeSchema);
module.exports = Trade;