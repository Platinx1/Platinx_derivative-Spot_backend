const mongoose = require("mongoose");
const { D } = require("../pi42Models/decimal");
const { Schema } = mongoose;

const transactionTypeEnum = [
  "DEPOSIT",  // Platinx main wallet se spot mein aaya
  "WITHDRAWAL",  // Spot se main wallet mein gaya
  "BUY",
  "SELL",   
  "FEE",
  "REFUND",
];

const statusEnum = ["INITIATED", "SUCCESS", "FAILED", "PENDING", "CANCELLED"];

const coinswitchWalletTransactionSchema = new Schema(
  {
    coinswitchAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoinSwitchSpotAccount",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: transactionTypeEnum,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: statusEnum,
      default: "INITIATED",
      index: true,
    },

    amount: { ...D("0"), required: true },
    fee: { ...D("0") },

    asset: {
      type: String,
      uppercase: true,
      trim: true,
      set: (v) => v?.toUpperCase(), // BTC, USDT, INR, ETH etc.
      default: "INR"
    },

    // Linked entities
    orderId: { type: String, index: true },
    tradeId: { type: String, index: true },
    pair: { 
      type: String, 
      uppercase: true, 
      trim: true 
    }, // BTC/USDT etc.

    // External timestamps
    coinswitchTransactionTime: { type: Date, default: Date.now, index: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Important indexes
coinswitchWalletTransactionSchema.index({ coinswitchAccount: 1, type: 1, coinswitchTransactionTime: -1 });
coinswitchWalletTransactionSchema.index({ coinswitchAccount: 1, asset: 1, coinswitchTransactionTime: -1 });

const CoinswitchWalletTransaction = mongoose.model("CoinswitchWalletTransaction", coinswitchWalletTransactionSchema);
module.exports = CoinswitchWalletTransaction;