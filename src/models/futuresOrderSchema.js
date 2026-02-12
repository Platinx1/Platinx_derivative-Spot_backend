const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../../utils/decimal");

const futuresOrderSchema = new Schema(
  {
    // 🔹 Ownership
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    subAccountId: {
      type: Schema.Types.ObjectId,
      ref: "SubAccount",
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

    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
      index: true,
    },

    positionSide: {
      type: String,
      enum: ["LONG", "SHORT"],
      required: true,
    },

    type: {
      type: String,
      enum: ["MARKET", "LIMIT", "STOP_MARKET", "STOP_LIMIT"],
      required: true,
    },

    timeInForce: {
      type: String,
      enum: ["GTC", "IOC", "FOK"],
      default: "GTC",
    },

    // 🔹 Pricing
    price: D(),
    stopPrice: D(),          // for stop orders
    quantity: D(),

    // 🔹 Execution Tracking
    filledQuantity: D(),
    avgPrice: D(),

    totalTradeValue: D(),
    totalExchangeFee: D(),
    totalPlatformFee: D(),

    // 🔹 Margin
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

    marginUsed: D(),

    maintenanceMargin: D(),      // snapshot
    liquidationPrice: D(),       // snapshot

    // 🔹 Flags
    reduceOnly: {
      type: Boolean,
      default: false,
    },

    isLiquidation: {
      type: Boolean,
      default: false,
    },

    orderSource: {
      type: String,
      enum: ["WEB", "APP", "API", "SYSTEM"],
      default: "WEB",
    },

    clientOrderId: {
      type: String,
      index: true,
    },

    exchangeOrderId: {
      type: String,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "OPEN",
        "PARTIALLY_FILLED",
        "FILLED",
        "CANCELLED",
        "REJECTED",
        "EXPIRED",
      ],
      default: "OPEN",
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

[
  "price",
  "stopPrice",
  "quantity",
  "filledQuantity",
  "avgPrice",
  "totalTradeValue",
  "totalExchangeFee",
  "totalPlatformFee",
  "marginUsed",
  "maintenanceMargin",
  "liquidationPrice",
].forEach((field) => {
  futuresOrderSchema.path(field).get(decimalGetter);
});

// Order book queries
futuresOrderSchema.index({ symbol: 1, status: 1 });

// User order history
futuresOrderSchema.index({ userId: 1, createdAt: -1 });

// Sub account isolation
futuresOrderSchema.index({ subAccountId: 1, createdAt: -1 });

// Exchange sync
futuresOrderSchema.index({ exchangeOrderId: 1 });


const FuturesOrder = mongoose.model("FuturesOrder", futuresOrderSchema);

module.exports = FuturesOrder;
