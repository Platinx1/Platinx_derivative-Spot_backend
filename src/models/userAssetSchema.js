const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../utils/decimals");

const userAssetSchema = new Schema(
  {
    // 🔹 Ownership (Sub-account based)
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
      default: "SPOT",
      index: true,
    },

    // 🔹 Portfolio Snapshot (Derived Data)

    totalQuantity: D(), // from wallet.balance
    lockedQuantity: D(), // from wallet.locked

    avgBuyPrice: D(),

    totalInvested: D(),

    realizedPnl: D(),
    unrealizedPnl: D(),

    lastUpdatedPrice: D(),

    // 🔹 Performance metrics
    pnlPercentage: D(),
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

[
  "totalQuantity",
  "lockedQuantity",
  "avgBuyPrice",
  "totalInvested",
  "realizedPnl",
  "unrealizedPnl",
  "lastUpdatedPrice",
  "pnlPercentage",
].forEach((field) => {
  userAssetSchema.path(field).get(decimalGetter);
});

userAssetSchema.index(
  { subAccountId: 1, asset: 1, walletType: 1 },
  { unique: true },
);

const UserAsset = mongoose.model("UserAsset", userAssetSchema);

module.exports = UserAsset;
