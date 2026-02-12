const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../../utils/decimal");

const settlementSchema = new Schema(
  {
    // 🔹 Settlement Date (midnight UTC recommended)
    date: {
      type: Date,
      required: true,
      index: true,
    },

    marketType: {
      type: String,
      enum: ["SPOT", "FUTURES"],
      required: true,
      index: true,
    },

    exchange: {
      type: String,
      default: "COINSWITCH",
      index: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "FINALIZED"],
      default: "OPEN",
      index: true,
    },

    // 🔹 Volume
    totalTradeVolume: D(),

    // 🔹 Fees
    totalPlatformFee: D(),
    totalExchangeFee: D(),
    totalGstCollected: D(),

    // 🔹 Revenue
    totalNetRevenue: D(),

    // 🔹 Risk
    totalLiquidations: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

[
  "totalTradeVolume",
  "totalPlatformFee",
  "totalExchangeFee",
  "totalGstCollected",
  "totalNetRevenue",
].forEach((field) => {
  settlementSchema.path(field).get(decimalGetter);
});

settlementSchema.index(
  { date: 1, marketType: 1, exchange: 1 },
  { unique: true }
);


const DailySettlement = mongoose.model("DailySettlement", settlementSchema);
module.exports = DailySettlement;
