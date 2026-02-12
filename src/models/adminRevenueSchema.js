const mongoose = require("mongoose");
const { D, decimalGetter } = require("../utils/decimals");

const adminRevenueSchema = new mongoose.Schema(
  {
    marketType: {
      type: String,
      enum: ["SPOT", "FUTURES"],
      required: true,
      index: true,
    },

    // 🔹 Gross platform earnings (before GST separation)
    totalPlatformFee: D(),

    // 🔹 GST collected from users
    totalGstCollected: D(),

    // 🔹 What you paid to exchange
    totalExchangeFeePaid: D(),

    // 🔹 Pure profit after exchange cost
    netRevenue: D(),

    // 🔹 Total trade volume (important for analytics)
    totalTradeVolume: D(),

    // 🔹 Total number of trades
    totalTrades: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

[
  "totalPlatformFee",
  "totalGstCollected",
  "totalExchangeFeePaid",
  "netRevenue",
  "totalTradeVolume",
].forEach((field) => {
  adminRevenueSchema.path(field).get(decimalGetter);
});

const AdminRevenue = mongoose.model("AdminRevenue", adminRevenueSchema);
module.exports = AdminRevenue;
