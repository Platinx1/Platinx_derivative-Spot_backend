const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../utils/decimals");

const subAccountSchema = new Schema(
  {
    // 🔹 Parent User
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🔹 Sub Account Name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["MAIN", "FUTURES", "BOT", "COPY_TRADING"],
      default: "MAIN",
      index: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "LIQUIDATED"],
      default: "ACTIVE",
      index: true,
    },

    // 🔹 External Exchange Mapping
    exchange: {
      type: String,
      default: "COINSWITCH",
    },

    exchangeSubAccountId: {
      type: String,
      index: true,
    },

    // 🔹 Margin Tracking (Futures specific)
    allocatedMargin: D(),

    availableMargin: D(),

    usedMargin: D(),

    // 🔹 Risk Controls
    maxLeverage: {
      type: Number,
      default: 20,
    },

    isAutoDeleveragingEnabled: {
      type: Boolean,
      default: true,
    },

    isTradingEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

[
  "allocatedMargin",
  "availableMargin",
  "usedMargin",
].forEach((field) => {
  subAccountSchema.path(field).get(decimalGetter);
});

subAccountSchema.index({ userId: 1, type: 1 });
subAccountSchema.index({ exchangeSubAccountId: 1 });


const SubAccount = mongoose.model("SubAccount", subAccountSchema);
module.exports = SubAccount;
