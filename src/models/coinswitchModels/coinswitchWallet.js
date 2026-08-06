const mongoose = require("mongoose");
const { D } = require("../pi42Models/decimal");
const { Schema } = mongoose;

const coinswitchWalletSchema = new Schema(
  {
    coinswitchAccount: {
      type: Schema.Types.ObjectId,
      ref: "CoinSwitchSpotAccount",
      required: true,
      index: true,
    },

    // ─── Core Wallet Balances ─────────────────────
    totalBalance: { ...D("0") },   // Total balance (free + locked)
    freeBalance: { ...D("0") },   // Available for trading / withdraw
    lockedBalance: { ...D("0") }, // In open orders

    // Spot specific (optional but useful)
    availableForSpot: { ...D("0") },       // Specifically spot trading ke liye available

    lastUpdatedAt: { type: Date, default: Date.now },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Indexes
coinswitchWalletSchema.index({ coinswitchAccount: 1 });

const CoinswitchWallet = mongoose.model("CoinswitchWallet", coinswitchWalletSchema);
module.exports = CoinswitchWallet;