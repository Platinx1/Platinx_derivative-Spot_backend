const mongoose = require("mongoose");
const { D } = require("./decimal");
const { Schema } = mongoose;

const orderLinkTypeEnum = ["ORDER", "ORDER_TP", "ORDER_SL", "ORDER_TP_SL"];
const orderSubTypeEnum = ["PRIMARY", "STOP_LOSS", "TAKE_PROFIT"];
const orderStatusEnum = ["NEW", "PARTIALLY_FILLED", "FILLED", "CANCELED", "REJECTED", "EXPIRED", "WAITING"];

const pi42OrderSchema = new Schema(
  {
    pi42Account: { type: Schema.Types.ObjectId, ref: "Pi42Account", required: true, index: true },

    orderId: { type: Number, required: true },
    clientOrderId: { type: String, required: true, unique: true, trim: true, index: true },

    contractPair: { type: String, required: true, uppercase: true, trim: true },
    contractType: { type: String, enum: ["PERPETUAL", "FUTURES"], required: true },
    type: { type: String, enum: ["MARKET", "LIMIT", "STOP_MARKET"], required: true },
    side: { type: String, enum: ["BUY", "SELL"], required: true },
    subType: { type: String, enum: orderSubTypeEnum, default: "PRIMARY" },
    linkType: { type: String, enum: orderLinkTypeEnum, default: "ORDER" },
    linkId: { type: String, index: true },

    price: { ...D("0") },
    stopPrice: { ...D("0") }, // for STOP orders
    orderAmount: { ...D("0"), required: true }, // origQty
    filledAmount: { ...D("0"), default: "0" },
    avgPrice: { ...D("0") },

    lockedMargin: { ...D("0") },

    status: { type: String, enum: orderStatusEnum, default: "NEW", required: true, index: true },
    reduceOnly: { type: Boolean, default: false },
    placeType: { type: String, enum: ["ORDER_FORM", "POSITION"] },

    leverage: { type: Number },
    baseAsset: { type: String, uppercase: true, trim: true }, // BTC
    quoteAsset: { type: String, uppercase: true, trim: true }, // INR
    marginAsset: { type: String, uppercase: true, trim: true }, // INR
    marginConversionRate: { ...D("1") },

    positionId: { type: String, index: true }, // linked position

    refId: { type: String, index: true }, // optional reference

    errorMessage: { type: String },

    pi42CreatedAt: { type: Date },
    pi42UpdatedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

pi42OrderSchema.index({ pi42Account: 1, status: 1 });
pi42OrderSchema.index({ linkId: 1 });
pi42OrderSchema.index({ pi42Account: 1, clientOrderId: 1 });

const Pi42Order = mongoose.model("Pi42Order", pi42OrderSchema);
module.exports = Pi42Order;