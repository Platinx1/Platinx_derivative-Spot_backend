const mongoose = require("mongoose");
const { Schema } = mongoose;

const coinSwitchSpotAccountSchema = new Schema(
  {
    // 🔹 Platinx User
    user: {
      type: String,
      required: true,
      index: true,
    },

    // 🔹 Spot Account Display Name
    name: {
      type: String,
      default: "Main Spot Account",
      trim: true,
    },

    // 🔹 Account Type (Internal Classification)
    type: {
      type: String,
      enum: ["MAIN", "BOT", "COPY_TRADING"],
      default: "MAIN",
      index: true,
    },

    // 🔹 Exchange
    exchange: {
      type: String,
      default: "COINSWITCH",
    },

    // 🔹 Account Status
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "LIQUIDATED"],
      default: "ACTIVE",
      index: true,
    },

    // 🔹 Spot Account Active Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // 🔹 Whether API Trading is enabled on this account
    isApiTradingEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// 🔹 Indexes
coinSwitchSpotAccountSchema.index({ user: 1, type: 1 });
coinSwitchSpotAccountSchema.index({ user: 1, status: 1 });

const CoinSwitchSpotAccount = mongoose.model("CoinSwitchSpotAccount", coinSwitchSpotAccountSchema);
module.exports = CoinSwitchSpotAccount;