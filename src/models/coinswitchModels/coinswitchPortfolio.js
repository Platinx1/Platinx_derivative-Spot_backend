const mongoose = require("mongoose");
const { D } = require("../pi42Models/decimal");
const { Schema } = mongoose;

const coinswitchPortfolioSchema = new Schema(
  {
    coinswitchAccount: {
      type: Schema.Types.ObjectId,
      ref: "CoinSwitchSpotAccount",
      required: true,
      index: true,
    },

    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // ─── Core Holdings ─────────────────────
    totalQuantity: { ...D("0") },
    // lockedQuantity: { ...D("0") }, // qty reserved by open SELL orders

    // ─── Price & Investment Info ─────────────────────
    averageBuyPrice: { ...D("0") }, 
    totalInvested: { ...D("0") },

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
coinswitchPortfolioSchema.index({ coinswitchAccount: 1, symbol: 1 }, { unique: true });
coinswitchPortfolioSchema.index({ coinswitchAccount: 1 });

const CoinswitchPortfolio = mongoose.model("CoinswitchPortfolio", coinswitchPortfolioSchema);
module.exports = CoinswitchPortfolio;