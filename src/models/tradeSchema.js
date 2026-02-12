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
      index: true,
    },

    // 🔹 Order reference
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "SpotOrder",
      required: true,
      index: true,
    },

    clientOrderId: {
      type: String,
      index: true,
    },

    exchangeTradeId: {
      type: String,
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
      enum: ["LONG", "SHORT"],
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
    },

    // 🔹 PnL (Futures)
    realizedPnl: D(),

    liquidityType: {
      type: String,
      enum: ["MAKER", "TAKER"],
    },

    // 🔹 Execution source
    executionSource: {
      type: String,
      enum: ["INTERNAL", "EXTERNAL"],
      default: "INTERNAL",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

[
  "price",
  "quantity",
  "quoteQuantity",
  "exchangeFee",
  "platformFee",
  "gst",
  "realizedPnl",
].forEach((field) => {
  tradeSchema.path(field).get(decimalGetter);
});


tradeSchema.index({ subAccountId: 1, createdAt: -1 });
tradeSchema.index({ marketType: 1, symbol: 1, createdAt: -1 });
tradeSchema.index({ orderId: 1 });
tradeSchema.index({ exchangeTradeId: 1 });


const Trade = mongoose.model("Trade", tradeSchema);
module.exports = Trade;