const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../utils/decimals");

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
    stopPrice: D(),
    quantity: D(),

    // 🔹 Execution Tracking
    filledQuantity: D(),
    
    remainingQuantity: D(), // ✅ NEW - quantity - filledQuantity
    
    avgPrice: D(),

    totalTradeValue: D(),
    
    totalExchangeFee: D(),
    totalPlatformFee: D(),
    totalGst: D(), // ✅ NEW - GST on platform fee

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
    
    initialMargin: D(), // ✅ NEW - margin locked at order creation

    maintenanceMargin: D(),
    liquidationPrice: D(),

    // 🔹 Flags
    reduceOnly: {
      type: Boolean,
      default: false,
    },

    postOnly: { // ✅ NEW - Only maker orders (won't take liquidity)
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

    // 🔹 Order IDs
    clientOrderId: {
      type: String,
      index: true,
    },

    exchangeOrderId: {
      type: String,
      index: true,
      sparse: true, // ✅ Allow null for orders not yet sent to exchange
    },

    // 🔹 Status
    status: {
      type: String,
      enum: [
        "PENDING",        // ✅ NEW - Order created but not sent to exchange
        "OPEN",
        "PARTIALLY_FILLED",
        "FILLED",
        "CANCELLED",
        "REJECTED",
        "EXPIRED",
      ],
      default: "PENDING", // ✅ Changed from OPEN
      index: true,
    },

    // 🔹 Position Reference (✅ NEW)
    positionId: {
      type: Schema.Types.ObjectId,
      ref: "FuturesPosition",
      index: true,
    },

    // 🔹 TP/SL Orders (✅ NEW)
    takeProfitPrice: D(),
    stopLossPrice: D(),
    
    // If this order is a TP/SL trigger
    triggerType: {
      type: String,
      enum: ["NONE", "TAKE_PROFIT", "STOP_LOSS"],
      default: "NONE",
    },

    triggeredBy: { // Original order that triggered this TP/SL
      type: Schema.Types.ObjectId,
      ref: "FuturesOrder",
    },

    // 🔹 Timestamps (✅ NEW)
    placedAt: Date,        // When order was placed
    executedAt: Date,      // When order was fully filled
    cancelledAt: Date,     // When order was cancelled
    rejectedAt: Date,      // When order was rejected

    // 🔹 Rejection/Cancellation reason (✅ NEW)
    rejectionReason: String,
    cancellationReason: String,

    // 🔹 Metadata
    meta: {
      ip: String,
      userAgent: String,
      deviceType: String, // WEB / MOBILE / API
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
  "stopPrice",
  "quantity",
  "filledQuantity",
  "remainingQuantity",
  "avgPrice",
  "totalTradeValue",
  "totalExchangeFee",
  "totalPlatformFee",
  "totalGst",
  "marginUsed",
  "initialMargin",
  "maintenanceMargin",
  "liquidationPrice",
  "takeProfitPrice",
  "stopLossPrice",
].forEach((field) => {
  futuresOrderSchema.path(field).get(decimalGetter);
});

// Indexes
futuresOrderSchema.index({ symbol: 1, status: 1 });
futuresOrderSchema.index({ userId: 1, createdAt: -1 });
futuresOrderSchema.index({ subAccountId: 1, createdAt: -1 });
futuresOrderSchema.index({ exchangeOrderId: 1 });
futuresOrderSchema.index({ clientOrderId: 1, subAccountId: 1 }); // ✅ Composite for uniqueness
futuresOrderSchema.index({ positionId: 1 }); // ✅ NEW - Link to position
futuresOrderSchema.index({ status: 1, createdAt: -1 }); // ✅ NEW - Active orders
futuresOrderSchema.index({ symbol: 1, side: 1, status: 1 }); // ✅ NEW - Order book depth

// Pre-save hook to calculate remainingQuantity
futuresOrderSchema.pre('save', function(next) {
  if (this.quantity && this.filledQuantity) {
    const qty = parseFloat(this.quantity);
    const filled = parseFloat(this.filledQuantity);
    this.remainingQuantity = (qty - filled).toFixed(8);
  }
  next();
});

const FuturesOrder = mongoose.model("FuturesOrder", futuresOrderSchema);
module.exports = FuturesOrder;