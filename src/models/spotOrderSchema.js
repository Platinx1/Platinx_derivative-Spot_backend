const mongoose = require("mongoose");
const { Schema } = mongoose;

const spotOrderSchema = new Schema(
  {
    // 🔹 Internal user linking
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

    type: {
      type: String,
      enum: ["MARKET", "LIMIT"],
      required: true,
    },

    timeInForce: {
      type: String,
      enum: ["GTC", "IOC", "FOK"],
      default: "GTC",
    },

    price: {
      type: Schema.Types.Decimal128,
    },

    quantity: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    amount: {
      // total INR used for buy orders
      type: Schema.Types.Decimal128,
    },

    lockedAmount: {
      // INR locked in wallet for BUY orders
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
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

    status: {
      type: String,
      enum: ["OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },

    clientOrderId: {
      type: String,
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


// 🔥 Decimal getter
function decimalGetter(value) {
  if (!value) return value;
  return value.toString();
}

spotOrderSchema.path("price").get(decimalGetter);
spotOrderSchema.path("quantity").get(decimalGetter);
spotOrderSchema.path("amount").get(decimalGetter);
spotOrderSchema.path("lockedAmount").get(decimalGetter);
spotOrderSchema.path("filledQuantity").get(decimalGetter);
spotOrderSchema.path("avgPrice").get(decimalGetter);
spotOrderSchema.path("fee").get(decimalGetter);


// 🔥 Useful indexes for dashboard
spotOrderSchema.index({ userId: 1, symbol: 1 });
spotOrderSchema.index({ userId: 1, status: 1 });


const SpotOrder = mongoose.model("SpotOrder", spotOrderSchema);

module.exports = SpotOrder;
