const mongoose = require("mongoose");
const { Schema } = mongoose;

const futuresOrderSchema = new Schema(
  {
    // 🔹 Mandatory userId (internal linking)
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // 🔹 User Snapshot (microservice safe)
    user: {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: String,
      email: String,
      role: String,
    },

    symbol: {
      type: String,
      required: true,
      index: true,
    },

    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },

    positionSide: {
      type: String,
      enum: ["LONG", "SHORT"],
      required: true,
    },

    type: {
      type: String,
      enum: ["MARKET", "LIMIT"],
      required: true,
    },

    price: {
      type: Schema.Types.Decimal128,
    },

    quantity: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    leverage: {
      type: Number,
      required: true,
      min: 1,
    },

    marginMode: {
      type: String,
      enum: ["ISOLATED", "CROSS"],
      default: "ISOLATED",
    },

    marginUsed: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    filledQuantity: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    avgPrice: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    fee: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    reduceOnly: {
      type: Boolean,
      default: false,
    },

    clientOrderId: {
      type: String,
      index: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },

    exchangeOrderId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);


// 🔥 Decimal to string getter
function decimalGetter(value) {
  if (!value) return value;
  return value.toString();
}

futuresOrderSchema.path("price").get(decimalGetter);
futuresOrderSchema.path("quantity").get(decimalGetter);
futuresOrderSchema.path("marginUsed").get(decimalGetter);
futuresOrderSchema.path("filledQuantity").get(decimalGetter);
futuresOrderSchema.path("avgPrice").get(decimalGetter);
futuresOrderSchema.path("fee").get(decimalGetter);


// 🔥 Compound indexes (fast query for user dashboard)
futuresOrderSchema.index({ userId: 1, symbol: 1 });
futuresOrderSchema.index({ userId: 1, status: 1 });


const FuturesOrder = mongoose.model("FuturesOrder", futuresOrderSchema);

module.exports = FuturesOrder;
