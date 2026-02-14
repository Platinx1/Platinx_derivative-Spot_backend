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
      required: true,
      index: true,
    },

    // 🔹 Asset Info
    asset: {
      type: String,
      required: true,
      uppercase: true,
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
        "REALIZED_PNL",
      ],
      required: true,
      index: true,
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
      type: String,
      index: true,
    },

    referenceModel: {
      type: String,
    },

    description: {
      type: String,
      maxlength: 500,
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
        enum: ["API", "WEB", "APP", "ADMIN", "SYSTEM", "CRON"],
      },
      userAgent: String,
      adminId: Schema.Types.ObjectId,
    },

    // 🔹 Error tracking
    errorMessage: String,

    // 🔹 Reversal tracking
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

// Indexes
walletTransactionSchema.index({ subAccountId: 1, createdAt: -1 });
walletTransactionSchema.index({ subAccountId: 1, asset: 1 });
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ referenceId: 1 });
walletTransactionSchema.index({ type: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, createdAt: -1 });
walletTransactionSchema.index({ transactionId: 1 });

// ✅ CRITICAL HELPER METHOD: Create transaction with automatic balance snapshot
walletTransactionSchema.statics.createTransaction = async function(transactionData) {
  const Wallet = mongoose.model("Wallet");
  
  const {
    subAccountId,
    userId,
    asset,
    walletType,
    type,
    direction,
    amount,
    referenceId,
    referenceModel,
    description,
    status = "COMPLETED",
    meta,
  } = transactionData;

  // Get wallet
  const wallet = await Wallet.findOne({
    subAccountId,
    asset,
    walletType,
  });

  if (!wallet) {
    throw new Error(`Wallet not found for ${asset} in ${walletType}`);
  }

  // Capture BEFORE snapshots
  const beforeBalance = wallet.balance;
  const beforeLocked = wallet.locked;

  // Generate unique transaction ID
  const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create transaction record
  const transaction = await this.create({
    subAccountId,
    userId,
    asset,
    walletType,
    transactionId,
    type,
    direction,
    amount,
    beforeBalance,
    afterBalance: beforeBalance, // Will be updated below
    beforeLocked,
    afterLocked: beforeLocked,   // Will be updated below
    referenceId,
    referenceModel,
    description,
    status,
    meta,
  });

  // Update AFTER snapshots based on actual wallet state
  // (This handles cases where wallet was updated between fetch and create)
  const updatedWallet = await Wallet.findById(wallet._id);
  transaction.afterBalance = updatedWallet.balance;
  transaction.afterLocked = updatedWallet.locked;
  await transaction.save();

  return transaction;
};

// ✅ HELPER METHOD: Reverse a transaction
walletTransactionSchema.statics.reverseTransaction = async function(
  originalTransactionId,
  reason,
  meta
) {
  const originalTxn = await this.findOne({
    transactionId: originalTransactionId,
  });

  if (!originalTxn) {
    throw new Error("Original transaction not found");
  }

  if (originalTxn.status === "REVERSED") {
    throw new Error("Transaction already reversed");
  }

  const Wallet = mongoose.model("Wallet");

  // Create reversal transaction (opposite direction)
  const reversalTxn = await this.createTransaction({
    subAccountId: originalTxn.subAccountId,
    userId: originalTxn.userId,
    asset: originalTxn.asset,
    walletType: originalTxn.walletType,
    type: originalTxn.type,
    direction: originalTxn.direction === "CREDIT" ? "DEBIT" : "CREDIT",
    amount: originalTxn.amount,
    referenceId: originalTxn._id.toString(),
    referenceModel: "WalletTransaction",
    description: `Reversal of ${originalTransactionId}: ${reason}`,
    status: "COMPLETED",
    reversalReason: reason,
    meta,
  });

  // Mark original as reversed
  originalTxn.status = "REVERSED";
  originalTxn.reversedBy = reversalTxn._id;
  originalTxn.reversalReason = reason;
  await originalTxn.save();

  return { originalTxn, reversalTxn };
};

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

module.exports = WalletTransaction;