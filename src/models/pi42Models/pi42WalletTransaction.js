const mongoose = require("mongoose");
const { D, toDecimal128 } = require("./decimal");
const { Schema } = mongoose;

// All possible transaction types from Pi42 docs
const transactionTypeEnum = [
  // Payment (Deposit / Withdraw)
  "DEPOSIT",
  "WITHDRAWAL",

  // Trading related
  "REALIZED_PNL",
  "COMMISSION",
  "GST_ON_COMMISSION",
  "FUNDING_FEE",
  "FEE_DISCOUNT",
  "GST_ON_FUNDING_FEE",
  "CLEARANCE_FEE",
  "GST_ON_CLEARANCE_FEE",
];

const paymentStatusEnum = ["INITIATED", "SUCCESS", "FAILED", "REFUND", "CANCELLED"];

const pi42WalletTransactionSchema = new Schema(
  {
    pi42Account: {
      type: Schema.Types.ObjectId,
      ref: "Pi42Account",
      required: true,
      index: true,
    },

    transactionId: { type: String, required: true, unique: true, index: true }, // Pi42's orderId 
    referenceId: { type: String, index: true }, // your own generated referenceId

    type: {
      type: String,
      enum: transactionTypeEnum,
      required: true,
      index: true,
    },

    // Payment specific fields (deposit/withdraw ke liye)
    paymentStatus: {
      type: String,
      enum: paymentStatusEnum,
      default: null,
    },
    adminRemarks: { type: String },

    // Amount fields
    amount: { ...D("0"), required: true },
    fee: { ...D("0") },
    amountCredited: { ...D("0") },
    amountDebited: { ...D("0") },

    asset: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      set: (v) => v?.toUpperCase(),
    }, // INR or USDT

    // Linked entities (optional)
    contractPair: { type: String, uppercase: true, trim: true },
    positionId: { type: String, index: true },
    orderId: { type: Number, index: true },
    tradeId: { type: Number, index: true },

    // Timestamps from Pi42
    pi42TransactionTime: { type: Date, required: true, index: true },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Important indexes (production ke liye)
pi42WalletTransactionSchema.index({ pi42Account: 1, type: 1, pi42TransactionTime: -1 });
pi42WalletTransactionSchema.index({ pi42Account: 1, asset: 1, pi42TransactionTime: -1 });
pi42WalletTransactionSchema.index({ referenceId: 1 });
pi42WalletTransactionSchema.index({ transactionId: 1 });

// pi42WalletTransactionSchema.statics.fromPi42Response = function (user, pi42Account, data) {
//   return {
//     pi42Account,
//     transactionId: data.orderId || data.transactionId || data.id,
//     referenceId: data.referenceId,
//     type: data.paymentType || data.type, // deposit/withdraw ya trading type
//     paymentStatus: data.paymentStatus || null,
//     amount: toDecimal128(data.amount),
//     fee: toDecimal128(data.fee ?? 0),
//     amountCredited: toDecimal128(data.amountCredited ?? 0),
//     amountDebited: toDecimal128(data.amountDebited ?? 0),
//     asset: data.marginAsset || data.asset,
//     contractPair: data.contractPair,
//     positionId: data.positionId,
//     orderId: data.orderId,
//     tradeId: data.tradeId,
//     adminRemarks: data.adminRemarks,
//     pi42TransactionTime: data.updatedAt || data.createdAt ? new Date(data.updatedAt || data.createdAt) : new Date(),
//   };
// };

const Pi42WalletTransaction = mongoose.model("Pi42WalletTransaction", pi42WalletTransactionSchema);
module.exports = Pi42WalletTransaction;