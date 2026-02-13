const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../utils/decimals");

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
      ref: "User",
      required: true, // ✅ Make it required for better queries
      index: true,
    },

    // 🔹 Asset Info
    asset: {
      type: String, // BTC, USDT, ETH, INR
      required: true,
      uppercase: true, // ✅ Force uppercase
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
        "REALIZED_PNL", // ✅ Added for P&L settlement
      ],
      required: true,
      index: true, // ✅ Added index for faster type-based queries
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
      type: String, // orderId / withdrawId / positionId / inrTransactionId
      index: true,
    },

    referenceModel: {
      type: String, // "SpotOrder", "FuturesPosition", "INRTransaction", etc.
    },

    description: {
      type: String,
      maxlength: 500, // ✅ Prevent extremely long descriptions
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
      default: "COMPLETED",
      index: true,
    },

    // 🔹 System safety & audit
    meta: {
      ip: String,
      source: {
        type: String,
        enum: ["API", "WEB", "APP", "ADMIN", "SYSTEM", "CRON"], // ✅ Better tracking
      },
      userAgent: String, // ✅ Track user's device/browser
      adminId: Schema.Types.ObjectId, // ✅ If admin made the change
    },

    // 🔹 Error tracking (for failed transactions)
    errorMessage: String,

    // 🔹 For reversal tracking
    reversedBy: {
      type: Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },

    reversalReason: String,
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Decimal field getters
[
  "amount",
  "beforeBalance",
  "afterBalance",
  "beforeLocked",
  "afterLocked",
].forEach((field) => {
  walletTransactionSchema.path(field).get(decimalGetter);
});

// Indexes for fast queries
walletTransactionSchema.index({ subAccountId: 1, createdAt: -1 });
walletTransactionSchema.index({ subAccountId: 1, asset: 1 });
walletTransactionSchema.index({ userId: 1, createdAt: -1 }); // ✅ Added for user history
walletTransactionSchema.index({ referenceId: 1 });
walletTransactionSchema.index({ type: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, createdAt: -1 }); // ✅ Added for pending txn queries
walletTransactionSchema.index({ transactionId: 1 }); // Already unique, but good for lookups

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

module.exports = WalletTransaction;