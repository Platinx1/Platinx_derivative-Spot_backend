const mongoose = require("mongoose");

const pi42PairsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    contractName: {
      type: String,
      required: true,
      trim: true,
    },
    makerFee: {
      type: Number,
      required: true,
    },
    takerFee: {
      type: Number,
      required: true,
    },
    maxLeverage: {
      type: String,
      required: true,
    },
    liquidationFee: {
      type: String,
      required: true,
    },
    depthGrouping: {
      type: String,
      required: true,
    },
    pricePrecision: {
      type: String,
      required: true,
    },
    quantityPrecision: {
      type: String,
      required: true,
    },
    notional: {
      type: String,
      required: true,
    },
    marginBufferPercentage: {
      type: String,
      required: true,
    },
    iconUrl: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,  
  } 
}
);

const Pi42Pairs = mongoose.model("pi42Pairs", pi42PairsSchema);
module.exports = Pi42Pairs;