const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../../utils/decimal");

const spotOrderSchema = new Schema(
  {
    // 🔹 Owner
    subAccountId: {
      type: Schema.Types.ObjectId,
      ref: "SubAccount",
      required: true,
      index: true,
    },

    // optional fast filtering
    userId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    symbol: {
      type: String,
      required: true,
      index: true,
    },

    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },

    type: {
      type: String,
      enum: ["MARKET", "LIMIT"],
      required: true,
    },

    timeInForce: {
      type: String,
      enum: ["GTC", "IOC", "FOK"],
      default: "GTC",
    },

    // 🔹 Pricing
    price: D(), // required for LIMIT

    quantity: D(), // base asset quantity

    quoteOrderQty: D(), // used for MARKET BUY (optional)

    // 🔹 Execution Tracking
    filledQuantity: D(),

    remainingQuantity: D(),

    avgPrice: D(),

    // 🔹 Wallet locking
    lockedAmount: D(), // quote asset locked

    // 🔹 Fee Breakdown
    fee: D(),
    feeAsset: {
      type: String,
      default: "USDT",
    },

    // 🔹 Order State
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

    // 🔹 Exchange Mapping
    clientOrderId: {
      type: String,
      index: true,
    },

    exchangeOrderId: {
      type: String,
      index: true,
    },

    // 🔹 Matching engine info
    executedQuoteQty: D(),
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

[
  "price",
  "quantity",
  "quoteOrderQty",
  "filledQuantity",
  "remainingQuantity",
  "avgPrice",
  "lockedAmount",
  "fee",
  "executedQuoteQty",
].forEach((field) => {
  spotOrderSchema.path(field).get(decimalGetter);
});

spotOrderSchema.index({ subAccountId: 1, symbol: 1 });
spotOrderSchema.index({ subAccountId: 1, status: 1 });
spotOrderSchema.index({ clientOrderId: 1, subAccountId: 1 }, { unique: true });



const SpotOrder = mongoose.model("SpotOrder", spotOrderSchema);

module.exports = SpotOrder;
