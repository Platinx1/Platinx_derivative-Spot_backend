const mongoose = require("mongoose");
const { D } = require("../pi42Models/decimal");
const { Schema } = mongoose;

const coinswitchTradeSchema = new Schema(
  {
    coinswitchAccount: {
      type: Schema.Types.ObjectId,
      ref: "CoinSwitchSpotAccount",
      required: true,
      index: true,
    },

    orderId: {
      type: String,
      required: true,
      index: true,
    },

    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },

    price: { ...D("0"), required: true },
    quantity: { ...D("0"), required: true },
    fee: { ...D("0") },

    totalAmount: { ...D("0") },  // (price * quantity) + fee
    realizedPnl: { ...D("0") }, // will be calculated when we sell the order

    tradeTime: { type: Date, default: Date.now, index: true },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true }, 
    toObject: { getters: true },
  }
);

coinswitchTradeSchema.index({ coinswitchAccount: 1, tradeTime: -1 });
coinswitchTradeSchema.index({ coinswitchAccount: 1, orderId: 1 });
coinswitchTradeSchema.index({ coinswitchAccount: 1, side: 1 });

const CoinswitchTrade = mongoose.model("CoinswitchTrade", coinswitchTradeSchema);
module.exports = CoinswitchTrade;