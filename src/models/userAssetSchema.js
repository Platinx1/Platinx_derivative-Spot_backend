const mongoose = require("mongoose");

const userAssetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    asset: {
      type: String, // BTC, ETH, USDT
      required: true,
      uppercase: true,
      index: true,
    },

    walletType: {
      type: String,
      enum: ["FUNDING", "SPOT", "FUTURES"],
      required: true,
      default: "SPOT",
      index: true,
    },

    free: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    locked: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    total: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    avgBuyPrice: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    totalInvested: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    realizedPnl: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    unrealizedPnl: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    lastUpdatedPrice: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },
  },
  { timestamps: true }
);

// Unique per user per wallet per asset
userAssetSchema.index({ user: 1, asset: 1, walletType: 1 }, { unique: true });

const UserAsset = mongoose.model("UserAsset", userAssetSchema);

module.exports = UserAsset;
