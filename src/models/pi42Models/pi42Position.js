const mongoose = require("mongoose");
const { D, toDecimal128 } = require("./decimal");
const { Schema } = mongoose;

const pi42PositionSchema = new Schema(
  {
    pi42Account: {
      type: Schema.Types.ObjectId,
      ref: "Pi42Account",
      required: true,
      index: true,
    },

    positionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Contract Info
    contractPair: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      set: (v) => v?.toUpperCase(),
    },
    baseAsset: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      set: (v) => v?.toUpperCase(),
    },
    quoteAsset: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      set: (v) => v?.toUpperCase(),
    },

    // Position Details (direct from docs)
    positionType: {
      type: String,
      enum: ["LONG", "SHORT"],
      required: true,
    },
    positionStatus: {
      type: String,
      enum: ["OPEN", "CLOSED", "LIQUIDATED"],   // ← sirf yeh 3 allowed (docs page 3)
      required: true,
      index: true,
    },

    entryPrice: { ...D("0"), required: true },
    liquidationPrice: { ...D("0") },

    quantity: { ...D("0"), required: true },
    positionAmount: { ...D("0") },
    positionSize: { ...D("0") },

    // Margin
    marginType: {
      type: String,
      enum: ["ISOLATED"],          // currently only this supported
      required: true,
      default: "ISOLATED",
    },
    marginAsset: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      set: (v) => v?.toUpperCase(),
    },
    margin: { ...D("0") },
    marginInMarginAsset: { ...D("0") },

    marginConversionRate: { ...D("1") },
    marginSettlementRate: { ...D("1") },
    maintenanceMarginPercentage: { ...D("0") },

    leverage: { type: Number, required: true },

    // PnL
    realizedProfit: { ...D("0") },
    realizedProfitInMarginAsset: { ...D("0") },

    autoTopUpEnabled: { type: Boolean, default: false },

    // Pi42 timestamp
    pi42CreatedAt: { type: Date },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// ====================== INDEXES ======================
pi42PositionSchema.index({ pi42Account: 1, positionStatus: 1 });
pi42PositionSchema.index({ pi42Account: 1, contractPair: 1 });
pi42PositionSchema.index({ pi42Account: 1, createdAt: -1 });
pi42PositionSchema.index({ positionId: 1 });

const Pi42Position = mongoose.model("Pi42Position", pi42PositionSchema);
module.exports = Pi42Position;