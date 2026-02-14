const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../utils/decimals");

const spotOrderSchema = new Schema(
  {
    // 🔹 Owner
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

    // 🔹 Market
    symbol: {
      type: String,
      required: true,
      uppercase: true, // ✅ Force uppercase
      index: true,
    },

    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },

    type: {
      type: String,
      enum: ["MARKET", "LIMIT", "STOP_LIMIT"], // ✅ Added STOP_LIMIT
      required: true,
    },

    timeInForce: {
      type: String,
      enum: ["GTC", "IOC", "FOK"],
      default: "GTC",
    },

    // 🔹 Pricing
    price: D(), // required for LIMIT

    stopPrice: D(), // ✅ NEW - for STOP_LIMIT orders

    quantity: D(), // base asset quantity (e.g., BTC)

    quoteOrderQty: D(), // used for MARKET BUY (e.g., USDT)

    // 🔹 Execution Tracking
    filledQuantity: D(),

    remainingQuantity: D(),

    avgPrice: D(),

    // 🔹 Fee Breakdown (✅ IMPROVED)
    totalExchangeFee: D(), // What you pay to CoinSwitch
    totalPlatformFee: D(), // Your revenue
    totalGst: D(),         // GST on platform fee
    
    feeAsset: {
      type: String,
      default: "USDT",
      uppercase: true,
    },

    liquidityType: { // ✅ NEW - Maker or Taker
      type: String,
      enum: ["MAKER", "TAKER"],
    },

    // 🔹 Wallet locking
    lockedAmount: D(), // quote asset locked (for BUY orders)

    // 🔹 Order State
    status: {
      type: String,
      enum: [
        "PENDING",           // ✅ NEW - Order created, not sent to exchange
        "OPEN",
        "PARTIALLY_FILLED",
        "FILLED",
        "CANCELLED",
        "REJECTED",
        "EXPIRED",
      ],
      default: "PENDING",    // ✅ Changed from OPEN
      index: true,
    },

    // 🔹 Order IDs
    clientOrderId: {
      type: String,
      index: true,
    },

    exchangeOrderId: {
      type: String,
      index: true,
      sparse: true, // ✅ Allow null
    },

    // 🔹 Order Source (✅ NEW)
    orderSource: {
      type: String,
      enum: ["WEB", "APP", "API", "SYSTEM"],
      default: "WEB",
    },

    // 🔹 Flags (✅ NEW)
    postOnly: { // Only maker orders
      type: Boolean,
      default: false,
    },

    // 🔹 Matching engine info
    executedQuoteQty: D(), // Total quote currency spent/received

    // 🔹 Timestamps (✅ NEW)
    placedAt: Date,
    executedAt: Date,
    cancelledAt: Date,
    rejectedAt: Date,

    // 🔹 Rejection/Cancellation reasons (✅ NEW)
    rejectionReason: String,
    cancellationReason: String,

    // 🔹 Metadata (✅ NEW)
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
  "quoteOrderQty",
  "filledQuantity",
  "remainingQuantity",
  "avgPrice",
  "lockedAmount",
  "totalExchangeFee",
  "totalPlatformFee",
  "totalGst",
  "executedQuoteQty",
].forEach((field) => {
  spotOrderSchema.path(field).get(decimalGetter);
});

// Indexes
spotOrderSchema.index({ subAccountId: 1, symbol: 1 });
spotOrderSchema.index({ subAccountId: 1, status: 1 });
spotOrderSchema.index({ userId: 1, createdAt: -1 }); // ✅ NEW - User order history
spotOrderSchema.index({ clientOrderId: 1, subAccountId: 1 }, { unique: true });
spotOrderSchema.index({ exchangeOrderId: 1 });
spotOrderSchema.index({ status: 1, createdAt: -1 }); // ✅ NEW - Active orders
spotOrderSchema.index({ symbol: 1, side: 1, status: 1 }); // ✅ NEW - Order book

// Pre-save hook to calculate remainingQuantity
spotOrderSchema.pre('save', function(next) {
  if (this.quantity && this.filledQuantity) {
    const qty = parseFloat(this.quantity);
    const filled = parseFloat(this.filledQuantity);
    this.remainingQuantity = (qty - filled).toFixed(8);
  }
  next();
});

const SpotOrder = mongoose.model("SpotOrder", spotOrderSchema);
module.exports = SpotOrder;