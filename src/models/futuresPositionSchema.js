const mongoose = require("mongoose");
const { Schema } = mongoose;

const futuresPositionSchema = new Schema(
  {
    // 🔹 Internal linking
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

    positionSide: {
      type: String,
      enum: ["LONG", "SHORT"],
      required: true,
    },

    quantity: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    entryPrice: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    markPrice: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
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

    margin: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    maintenanceMargin: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    unrealizedPnl: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    realizedPnl: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    liquidationPrice: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },

    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
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

futuresPositionSchema.path("quantity").get(decimalGetter);
futuresPositionSchema.path("entryPrice").get(decimalGetter);
futuresPositionSchema.path("markPrice").get(decimalGetter);
futuresPositionSchema.path("margin").get(decimalGetter);
futuresPositionSchema.path("maintenanceMargin").get(decimalGetter);
futuresPositionSchema.path("unrealizedPnl").get(decimalGetter);
futuresPositionSchema.path("realizedPnl").get(decimalGetter);
futuresPositionSchema.path("liquidationPrice").get(decimalGetter);


// 🔥 One active position per user per symbol per side
futuresPositionSchema.index(
  { userId: 1, symbol: 1, positionSide: 1 },
  { unique: true }
);


const FuturesPosition = mongoose.model(
  "FuturesPosition",
  futuresPositionSchema
);

module.exports = FuturesPosition;
