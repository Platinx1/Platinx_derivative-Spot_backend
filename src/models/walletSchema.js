const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../utils/decimals");
const Decimal = require("decimal.js"); // ✅ ADD THIS IMPORT

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

    // 🔹 Additional Tracking
    totalDeposited: D(),
    totalWithdrawn: D(),
    totalTradeVolume: D(),
    totalFeesPaid: D(),

    // 🔹 Risk Flags
    isLiquidationBlocked: {
      type: Boolean,
      default: false,
    },

    isFrozen: {
      type: Boolean,
      default: false,
      index: true,
    },

    frozenReason: String,
    frozenAt: Date,

    frozenBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },

    // 🔹 Sync Tracking
    lastSyncedAt: Date,

    syncStatus: {
      type: String,
      enum: ["IN_SYNC", "OUT_OF_SYNC", "SYNC_FAILED"],
      default: "IN_SYNC",
    },

    lastSyncError: String,

    // 🔹 Version control for concurrent updates
    version: {
      type: Number,
      default: 0,
    },

    // 🔹 Metadata
    meta: {
      lastDepositAt: Date,
      lastWithdrawAt: Date,
      lastTradeAt: Date,
      createdSource: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
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
  "totalDeposited",
  "totalWithdrawn",
  "totalTradeVolume",
  "totalFeesPaid",
].forEach((field) => {
  walletSchema.path(field).get(decimalGetter);
});

// Virtual field: available balance
walletSchema.virtual("available").get(function () {
  const balance = this.balance ? parseFloat(this.balance) : 0;
  const locked = this.locked ? parseFloat(this.locked) : 0;
  return (balance - locked).toFixed(8);
});

// Virtual field: total balance (balance + locked)
walletSchema.virtual("totalBalance").get(function () {
  const balance = this.balance ? parseFloat(this.balance) : 0;
  const locked = this.locked ? parseFloat(this.locked) : 0;
  return (balance + locked).toFixed(8);
});

// Virtual field: net P&L
walletSchema.virtual("netPnl").get(function () {
  const realized = this.totalRealizedPnl ? parseFloat(this.totalRealizedPnl) : 0;
  const unrealized = this.totalUnrealizedPnl ? parseFloat(this.totalUnrealizedPnl) : 0;
  return (realized + unrealized).toFixed(8);
});

// Indexes
walletSchema.index(
  { subAccountId: 1, asset: 1, walletType: 1 },
  { unique: true }
);
walletSchema.index({ userId: 1, walletType: 1 });
walletSchema.index({ asset: 1, walletType: 1 });
walletSchema.index({ isFrozen: 1 });
walletSchema.index({ syncStatus: 1, lastSyncedAt: 1 });

// Pre-save hook for version control
walletSchema.pre('save', function(next) {
  if (this.isModified('balance') || this.isModified('locked')) {
    this.version += 1;
  }
  next();
});

// Static method: Safe balance update with optimistic locking
walletSchema.statics.safeUpdateBalance = async function(
  walletId, 
  balanceChange, 
  lockedChange = 0
) {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    const wallet = await this.findById(walletId);
    
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const currentVersion = wallet.version;
    
    // ✅ Using Decimal.js for precise calculations
    const newBalance = new Decimal(wallet.balance || "0")
      .plus(balanceChange)
      .toString();
    
    const newLocked = new Decimal(wallet.locked || "0")
      .plus(lockedChange)
      .toString();

    // Check if balance would go negative
    if (parseFloat(newBalance) < 0) {
      throw new Error("Insufficient balance");
    }

    // Check if locked would go negative
    if (parseFloat(newLocked) < 0) {
      throw new Error("Invalid locked amount");
    }

    // Attempt update with version check (optimistic locking)
    const result = await this.updateOne(
      { _id: walletId, version: currentVersion },
      {
        $set: {
          balance: newBalance,
          locked: newLocked,
        },
        $inc: { version: 1 },
      }
    );

    if (result.modifiedCount === 1) {
      return await this.findById(walletId);
    }

    retries++;
    
    // Small delay before retry
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  throw new Error("Failed to update wallet after multiple retries (concurrent modification)");
};

// Static method: Lock funds
walletSchema.statics.lockFunds = async function(walletId, amount) {
  // Move from balance to locked
  return await this.safeUpdateBalance(
    walletId, 
    new Decimal(amount).negated().toString(), // Negative balance change
    amount // Positive locked change
  );
};

// Static method: Unlock funds
walletSchema.statics.unlockFunds = async function(walletId, amount) {
  // Move from locked to balance
  return await this.safeUpdateBalance(
    walletId, 
    amount, // Positive balance change
    new Decimal(amount).negated().toString() // Negative locked change
  );
};

const Wallet = mongoose.model("Wallet", walletSchema);
module.exports = Wallet;