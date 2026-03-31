const mongoose = require("mongoose");
const { D, decimalGetter } = require("../utils/decimals");

const feeLedgerSchema = new mongoose.Schema(
  {
    marketType: {
      type: String,
      enum: ["SPOT", "FUTURES"],
      required: true,
      index: true,
    },

    tradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trade",
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Fee charged from user
    platformFee: D(),

    // GST part
    gstAmount: D(),

    // Exchange cost for this trade
    exchangeFee: D(),

    // Pure earning
    netRevenue: D(),

    // Trade value reference (optional but useful)
    tradeVolume: D(),

    currency: {
      type: String,
      default: "USDT",
    },

    status: {
      type: String,
      enum: ["PENDING", "SETTLED"],
      default: "SETTLED",
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

[
  "platformFee",
  "gstAmount",
  "exchangeFee",
  "netRevenue",
  "tradeVolume",
].forEach((field) => {
  feeLedgerSchema.path(field).get(decimalGetter);
});


const FeeLedger = mongoose.model("FeeLedger", feeLedgerSchema);
module.exports = FeeLedger;