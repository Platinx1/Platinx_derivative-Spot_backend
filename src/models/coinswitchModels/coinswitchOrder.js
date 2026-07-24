const mongoose = require("mongoose");
const { D } = require("../pi42Models/decimal");
const { Schema } = mongoose;

const orderStatusEnum = ["RAISED", "OPEN", "EXECUTED", "PARTIALLY_EXECUTED", "CANCELLED", "DISCARDED", "EXPIRED", "CANCELLATION_RAISED", "EXPIRATION_RAISED"];
const sideEnum = ["BUY", "SELL"];
const orderTypeEnum = ["LIMIT", "MARKET"];

const coinswitchOrderSchema = new Schema(
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
      unique: true,
      index: true,
    },

    symbol: {  // BTC/INR
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    side: {
      type: String,
      enum: sideEnum,
      required: true,
    },

    type: {
      type: String,
      enum: orderTypeEnum,
      required: true,
    },

    price: { ...D("0") }, // this is the limit price
    quantity: { ...D("0"), required: true },
    executedQty: { ...D("0"), default: "0" },
    averagePrice: { ...D("0"), default: "0" }, // price at which the order was executed
    lockedBalance: { ...D("0"), default: "0" },

    status: {
      type: String,
      enum: orderStatusEnum,
      default: "OPEN",
      index: true,
    },

    exchange: { type: String, uppercase: true, trim: true },

    createdTime: { type: Date },
    updatedTime: { type: Date },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

coinswitchOrderSchema.virtual('openOrderQty').get(function() {
  const openStatuses = ["RAISED", "OPEN", "PARTIALLY_EXECUTED"];
  
  if (openStatuses.includes(this.status)) {
    const totalQty = Number(this.quantity) || 0;
    const executed = Number(this.executedQty) || 0;
    return totalQty - executed;
  }
  
  return 0;   // 0 in case of CLOSED, CANCELLED, EXECUTED
});

coinswitchOrderSchema.index({ coinswitchAccount: 1, status: 1 });
coinswitchOrderSchema.index({ coinswitchAccount: 1, symbol: 1 });
coinswitchOrderSchema.index({ coinswitchAccount: 1, createdTime: -1 });

const CoinswitchOrder = mongoose.model("CoinswitchOrder", coinswitchOrderSchema);
module.exports = CoinswitchOrder;