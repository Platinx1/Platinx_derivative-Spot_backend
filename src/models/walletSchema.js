const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../utils/decimals");

const walletSchema = new Schema(
  {
    // 🔹 Owner
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

    // 🔹 Asset (VERY IMPORTANT)
    asset: {
      type: String, // BTC, USDT, ETH, INR
      required: true,
      uppercase: true,
      index: true,
    },

    // 🔹 Total balance
    balance: D(),

    // 🔹 Locked (orders / margin)
    locked: D(),

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

    // 🔹 Last update timestamp (for sync with CoinSwitch)
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Decimal fields
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

// Virtual field: available balance
walletSchema.virtual("available").get(function () {
  const balance = this.balance ? parseFloat(this.balance) : 0;
  const locked = this.locked ? parseFloat(this.locked) : 0;
  return (balance - locked).toFixed(8);
});

// Indexes
walletSchema.index(
  { subAccountId: 1, asset: 1, walletType: 1 },
  { unique: true }
);
walletSchema.index({ userId: 1, walletType: 1 });
walletSchema.index({ asset: 1, walletType: 1 });

const Wallet = mongoose.model("Wallet", walletSchema);
module.exports = Wallet;