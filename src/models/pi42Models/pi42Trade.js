// models/pi42Models/pi42Trade.model.js
const mongoose = require("mongoose");
const { D, toDecimal128 } = require("./decimal");
const { Schema } = mongoose;

const pi42TradeSchema = new Schema(
  {
    pi42Account: {
      type: Schema.Types.ObjectId,
      ref: "Pi42Account",
      required: true,
      index: true,
    },

    // Primary keys from Pi42
    tradeId: { type: Number, required: true, index: true },
    clientOrderId: { type: String, index: true },
    positionId: { type: String, index: true },

    // Trade Details
    contractPair: { 
      type: String, 
      required: true, 
      uppercase: true, 
      trim: true 
    }, // symbol in response

    price: { ...D("0"), required: true },      // executedPrice
    quantity: { ...D("0"), required: true },   // executedQuantity

    side: { 
      type: String, 
      enum: ["BUY", "SELL"], 
      index: true,
      required: true 
    },

    tradeRole: { 
      type: String, 
      enum: ["MAKER", "TAKER"], 
      required: true 
    }, // role in response

    // Financials
    realizedPnl: { ...D("0") },
    commission: { ...D("0") },                    // fee
    commissionAsset: { type: String, uppercase: true, trim: true },

    // Extra useful fields from response
    feeInMarginAsset: { ...D("0") },
    realizedPnlInMarginAsset: { ...D("0") },
    marginAsset: { 
      type: String, 
      uppercase: true, 
      trim: true 
    },

    marginConversionRate: { ...D("1") },
    marginSettlementRate: { ...D("1") },

    clearanceFee: { ...D("0") },
    clearanceFeeInMarginAsset: { ...D("0") },

    // Timestamps
    pi42TradeTime: { type: Date, required: true, index: true }, // tradeTime

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// ==================== Indexes ====================
pi42TradeSchema.index({ pi42Account: 1, tradeId: 1 }, { unique: true });
pi42TradeSchema.index({ pi42Account: 1, pi42TradeTime: -1 });
pi42TradeSchema.index({ contractPair: 1, pi42TradeTime: -1 });
pi42TradeSchema.index({ clientOrderId: 1 });
pi42TradeSchema.index({ positionId: 1, side: 1 });

const Pi42Trade = mongoose.model("Pi42Trade", pi42TradeSchema);
module.exports = Pi42Trade;