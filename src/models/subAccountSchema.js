const mongoose = require("mongoose");
const { Schema } = mongoose;

const subAccountSchema = new Schema(
  {
    // 🔹 Platinx registered User
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 🔹 Sub Account Display Name
    name: {
      type: String,
      default: "Main Account",
      trim: true,
    },

    // 🔹 Sub Account Type (CoinSwitch doesn't differentiate — this is your internal classification)
    type: {
      type: String,
      enum: ["MAIN", "BOT", "COPY_TRADING"],
      default: "MAIN",
      index: true,
    },

    // 🔹 Exchange Info
    exchange: {
      type: String,
      default: "COINSWITCH",
    },

    // 🔹 CoinSwitch Subaccount ID (int64 from API, store as String to avoid precision loss)
    exchangeSubAccountId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },

    // 🔹 CoinSwitch API Credentials for this subaccount
    // ⚠️ Store encrypted in production — never plain text
    apiKey: {
      type: String,
      select: false, // Never returned in queries by default
    },

    apiSecret: {
      type: String,
      select: false, // Never returned in queries by default
    },

    // 🔹 Account Status
    // ACTIVE   → is_active: true  (from CoinSwitch)
    // SUSPENDED → is_active: false (disabled via PUT /master/subaccount/disable)
    // LIQUIDATED → your internal state (e.g., funds recalled, account to be cleaned up)
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "LIQUIDATED"],
      default: "ACTIVE",
      index: true,
    },

    // 🔹 Mirror of CoinSwitch's is_active flag
    // Kept in sync with CoinSwitch — disabled subaccounts block TRANSFER_IN
    isActive: {
      type: Boolean,
      default: true,
    },

    // 🔹 For algo/API traders on your platform
    isApiTradingEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// 🔹 Indexes
subAccountSchema.index({ userId: 1, type: 1 });
subAccountSchema.index({ userId: 1, status: 1 });
subAccountSchema.index({ exchangeSubAccountId: 1 });

const SubAccount = mongoose.model("SubAccount", subAccountSchema);
module.exports = SubAccount;