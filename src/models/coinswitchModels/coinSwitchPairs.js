const mongoose = require("mongoose");

const coinSwitchPairSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    minQty: {
      type: Number,
    },
    maxQty: {
      type: Number,
    },
    quantityPrecision: {
      type: Number,
    },
    pricePrecision: {
      type: Number,
    },
  },
);

coinSwitchPairSchema.index({ name: 1 });

const CoinSwitchPairs = mongoose.model("coinSwitchPairs", coinSwitchPairSchema);
module.exports = CoinSwitchPairs;