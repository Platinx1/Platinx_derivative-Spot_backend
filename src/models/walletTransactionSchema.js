const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletTransactionSchema = new Schema(
  {
    // 🔹 Internal linking
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // 🔹 User snapshot (microservice safe)
    user: {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: String,
      email: String,
      role: String,
    },

    // 🔹 Unique internal transaction ID
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "DEPOSIT",
        "WITHDRAW",
        "TRANSFER",
        "SPOT_TRADE",
        "FUTURES_TRADE",
        "FEE",
        "LIQUIDATION",
      ],
      required: true,
    },

    walletType: {
      type: String,
      enum: ["FUNDING", "SPOT", "FUTURES"],
      required: true,
    },

    direction: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    beforeBalance: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    balanceAfter: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    referenceId: {
      // orderId / withdrawId / transferId
      type: String,
      index: true,
    },

    description: {
      type: String,
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "COMPLETED",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);


// 🔥 Decimal getter
function decimalGetter(value) {
  if (!value) return value;
  return value.toString();
}

walletTransactionSchema.path("amount").get(decimalGetter);
walletTransactionSchema.path("beforeBalance").get(decimalGetter);
walletTransactionSchema.path("balanceAfter").get(decimalGetter);


// 🔥 Useful indexes
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ userId: 1, walletType: 1 });


const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

module.exports = WalletTransaction;
