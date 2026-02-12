const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../../utils/decimal");

const walletTransactionSchema = new Schema(
  {
    // 🔹 Ownership
    subAccountId: {
      type: Schema.Types.ObjectId,
      ref: "SubAccount",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    // 🔹 Asset Info
    asset: {
      type: String, // BTC, USDT, ETH
      required: true,
      index: true,
    },

    walletType: {
      type: String,
      enum: ["FUNDING", "SPOT", "FUTURES"],
      required: true,
      index: true,
    },

    // 🔹 Unique internal transaction ID
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // 🔹 Business Type
    type: {
      type: String,
      enum: [
        "DEPOSIT",
        "WITHDRAW",
        "INTERNAL_TRANSFER",
        "SPOT_TRADE",
        "FUTURES_TRADE",
        "FEE",
        "FUNDING_FEE",
        "LIQUIDATION",
        "ADJUSTMENT",
      ],
      required: true,
    },

    direction: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    // 🔹 Amount Impact
    amount: D(),

    // 🔹 Balance Snapshots (AUDIT CRITICAL)
    beforeBalance: D(),
    afterBalance: D(),

    beforeLocked: D(),
    afterLocked: D(),

    // 🔹 Reference Linking
    referenceId: {
      type: String, // orderId / withdrawId / positionId
      index: true,
    },

    referenceModel: {
      type: String, // "SpotOrder", "FuturesPosition"
    },

    description: String,

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
      default: "COMPLETED",
      index: true,
    },

    // 🔹 System safety
    meta: {
      ip: String,
      source: String, // API / ADMIN / SYSTEM
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);


[
  "amount",
  "beforeBalance",
  "afterBalance",
  "beforeLocked",
  "afterLocked",
].forEach((field) => {
  walletTransactionSchema.path(field).get(decimalGetter);
});

walletTransactionSchema.index({ subAccountId: 1, createdAt: -1 });
walletTransactionSchema.index({ subAccountId: 1, asset: 1 });
walletTransactionSchema.index({ referenceId: 1 });
walletTransactionSchema.index({ type: 1, createdAt: -1 });



const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

module.exports = WalletTransaction;
