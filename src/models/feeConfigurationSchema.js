const mongoose = require("mongoose");
const { D, decimalGetter } = require("../utils/decimals");

const feeConfigSchema = new mongoose.Schema(
  {
    marketType: {
      type: String,
      enum: ["SPOT", "FUTURES"],
      required: true,
      unique: true, // Only one config per market type
      index: true,
    },

    // Platform fees (your revenue)
    platformFeeRate: D(), // 0.001 = 0.1%
    
    // Exchange fees (what CoinSwitch charges you)
    exchangeFeeRate: D(), // 0.0002 = 0.02%
    
    // GST rate (18% in India)
    gstRate: D(), // 0.18 = 18%
    
    // Maker/Taker fees
    makerFeeRate: D(), // 0.0008 = 0.08%
    takerFeeRate: D(), // 0.001 = 0.1%
    
    // Active status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

[
  "platformFeeRate",
  "exchangeFeeRate",
  "gstRate",
  "makerFeeRate",
  "takerFeeRate",
].forEach((field) => {
  feeConfigSchema.path(field).get(decimalGetter);
});

const FeeConfig = mongoose.model("FeeConfig", feeConfigSchema);
module.exports = FeeConfig;