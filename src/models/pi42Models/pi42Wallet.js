// models/pi42Wallet.model.js
const mongoose = require("mongoose");
const { D } = require("./decimal");
const { Schema } = mongoose;

const pi42WalletSchema = new Schema(
  {
    pi42Account: {
      type: Schema.Types.ObjectId,
      ref: "Pi42Account",
      required: true,
      index: true,
    },

    marginAsset: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      set: (v) => v?.toUpperCase(),
    }, // "INR" or "USDT"

    // ─── Core Wallet Balances (Essential Fields) ─────────────────────
    walletBalance: { ...D("0") },           // Total balance
    withdrawableBalance: { ...D("0") },     // User kitna withdraw kar sakta hai
    maxWithdrawableBalance: { ...D("0") },  // Maximum withdrawable amount
    lockedBalance: { ...D("0") },           // Orders/positions mein locked
    marginBalance: { ...D("0") },           // Margin ke liye available balance (new position open karne k liye kitna balance availabe hai)

    // ─── Extra Useful Fields ────────────────────────────────────────
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
pi42WalletSchema.index({ pi42Account: 1, marginAsset: 1 }, { unique: true });
pi42WalletSchema.index({ pi42Account: 1 });

const Pi42Wallet = mongoose.model("Pi42Wallet", pi42WalletSchema);
module.exports = Pi42Wallet;