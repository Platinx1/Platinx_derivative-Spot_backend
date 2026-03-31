const mongoose = require("mongoose");
const { Schema } = mongoose;

const subAccountSchema = new Schema(
  {
    // 🔹 Platinx registered User
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🔹 Sub Account Name
    name: {
      type: String,
      default: "Main Account",
      trim: true,
    },

    // 🔹 Sub Account Type
    type: {
      type: String,
      enum: ["MAIN", "BOT", "COPY_TRADING"], // ❌ Removed "FUTURES"
      default: "MAIN",
      index: true,
    },

    // 🔹 Account Status
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
      unique: true,
      sparse: true,
    },

    // 🔹 Trading Permissions (✅ NEW)
    spotTradingEnabled: {
      type: Boolean,
      default: true, // Spot enabled by default
    },

    futuresTradingEnabled: {
      type: Boolean,
      default: false, // User needs to enable futures manually
    },

    // 🔹 Risk Controls (Futures specific)
    maxLeverage: {
      type: Number,
      default: 20,
      min: 1,
      max: 125,
    },

    isAutoDeleveragingEnabled: {
      type: Boolean,
      default: true,
    },

    // 🔹 Additional Flags
    isApiTradingEnabled: {
      type: Boolean,
      default: false, // For algo traders
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Indexes
subAccountSchema.index({ userId: 1, type: 1 });
subAccountSchema.index({ exchangeSubAccountId: 1 });
subAccountSchema.index({ userId: 1, status: 1 });

const SubAccount = mongoose.model("SubAccount", subAccountSchema);
module.exports = SubAccount;