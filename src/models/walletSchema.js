const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../../utils/decimal");

const walletSchema = new Schema(
  {
    // 🔹 Owner
    subAccountId: {
      type: Schema.Types.ObjectId,
      ref: "SubAccount",
      required: true,
      index: true,
    },

    // optional fast filtering
    userId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    // 🔹 Asset (VERY IMPORTANT)
    asset: {
      type: String, // BTC, USDT, ETH
      required: true,
      index: true,
    },

    // 🔹 Total balance
    balance: D(),

    // 🔹 Locked (orders / margin)
    locked: D(),

    // 🔹 Available (virtual field calculated in service layer)
    // available = balance - locked

    // 🔹 Wallet Type
    walletType: {
      type: String,
      enum: ["FUNDING", "SPOT", "FUTURES"],
      required: true,
      index: true,
    },

    // 🔹 Futures Specific (only used when walletType = FUTURES)
    crossMarginBalance: D(),

    isolatedMarginBalance: D(),

    // 🔹 PnL Tracking
    totalRealizedPnl: D(),

    totalUnrealizedPnl: D(),

    // 🔹 Risk Flags
    isLiquidationBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

[
  "balance",
  "locked",
  "crossMarginBalance",
  "isolatedMarginBalance",
  "totalRealizedPnl",
  "totalUnrealizedPnl",
].forEach((field) => {
  walletSchema.path(field).get(decimalGetter);
});


walletSchema.index(
  { subAccountId: 1, asset: 1, walletType: 1 },
  { unique: true }
);

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
