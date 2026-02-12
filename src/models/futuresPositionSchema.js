const mongoose = require("mongoose");
const { Schema } = mongoose;
const { D, decimalGetter } = require("../../utils/decimal");

const futuresPositionSchema = new Schema(
  {
    // 🔹 Ownership
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

    // 🔹 Market
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },

    positionSide: {
      type: String,
      enum: ["LONG", "SHORT"],
      required: true,
    },

    // 🔹 Core Position
    quantity: D(),              // always positive

    entryPrice: D(),

    markPrice: D(),

    leverage: {
      type: Number,
      required: true,
      min: 1,
      max: 125,
    },

    marginMode: {
      type: String,
      enum: ["ISOLATED", "CROSS"],
      default: "ISOLATED",
    },

    // 🔹 Margin
    initialMargin: D(),

    margin: D(),

    maintenanceMargin: D(),

    isolatedWalletBalance: D(),   // important for isolated mode

    // 🔹 PnL
    unrealizedPnl: D(),

    realizedPnl: D(),

    fundingFeeAccrued: D(),

    // 🔹 Risk
    liquidationPrice: D(),

    bankruptcyPrice: D(),

    autoDeleveragingEligible: {
      type: Boolean,
      default: false,
    },

    // 🔹 State
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "LIQUIDATED"],
      default: "OPEN",
      index: true,
    },

    // 🔹 Exchange Mapping
    exchangePositionId: {
      type: String,
      index: true,
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
  "quantity",
  "entryPrice",
  "markPrice",
  "initialMargin",
  "margin",
  "maintenanceMargin",
  "isolatedWalletBalance",
  "unrealizedPnl",
  "realizedPnl",
  "fundingFeeAccrued",
  "liquidationPrice",
  "bankruptcyPrice",
].forEach((field) => {
  futuresPositionSchema.path(field).get(decimalGetter);
});

// One active position per symbol per side per subaccount
futuresPositionSchema.index(
  { subAccountId: 1, symbol: 1, positionSide: 1 },
  { unique: true }
);

// Fast user dashboard queries
futuresPositionSchema.index({ userId: 1, status: 1 });

// Market risk engine scan
futuresPositionSchema.index({ symbol: 1, status: 1 });



const FuturesPosition = mongoose.model(
  "FuturesPosition",
  futuresPositionSchema
);

module.exports = FuturesPosition;
