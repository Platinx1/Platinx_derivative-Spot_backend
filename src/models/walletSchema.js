const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletSchema = new Schema(
  {
    // 🔹 Internal linking
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
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

    // 🔹 Funding Wallet (Deposit / Withdraw)
    fundingBalance: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    // 🔹 Spot Wallet
    spotBalance: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    spotLocked: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    // 🔹 Futures Wallet
    futuresBalance: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    futuresLocked: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    // 🔹 PnL Tracking
    totalRealizedPnl: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    totalUnrealizedPnl: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
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

walletSchema.path("fundingBalance").get(decimalGetter);
walletSchema.path("spotBalance").get(decimalGetter);
walletSchema.path("spotLocked").get(decimalGetter);
walletSchema.path("futuresBalance").get(decimalGetter);
walletSchema.path("futuresLocked").get(decimalGetter);
walletSchema.path("totalRealizedPnl").get(decimalGetter);
walletSchema.path("totalUnrealizedPnl").get(decimalGetter);


const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
