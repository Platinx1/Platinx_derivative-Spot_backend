const mongoose = require("mongoose");

const { Schema } = mongoose;

const pi42OrderSchema = new Schema(
  {
    // Reference to your platform's user
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Reference to Pi42 account
    pi42Account: {
      type: Schema.Types.ObjectId,
      ref: "Pi42Account",
      required: true,
      index: true,
    },

    // ─── Pi42 Order Identity ───────────────────────────────────────────
    pi42OrderId: {
      type: String,
      default: null, // populated after Pi42 responds
    },

    // ─── Place Type ───────────────────────────────────────────────────
    placeType: {
      type: String,
      enum: ["ORDER_FORM", "POSITION"],
      required: true,
    },

    // ─── Core Order Fields ────────────────────────────────────────────
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    side: {
      type: String,
      enum: ["BUY", "SELL"],
      // required only for ORDER_FORM, validated at service layer
    },

    type: {
      type: String,
      enum: ["MARKET", "LIMIT", "STOP_MARKET"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    reduceOnly: {
      type: Boolean,
      default: false,
    },

    // ─── Pricing Fields ───────────────────────────────────────────────
    price: {
      type: Number,
      default: null, // required if type is LIMIT
    },

    stopLossPrice: {
      type: Number,
      default: null,
    },

    takeProfitPrice: {
      type: Number,
      default: null,
    },

    // ─── ORDER_FORM specific ──────────────────────────────────────────
    marginAsset: {
      type: String,
      uppercase: true,
      trim: true,
      default: "INR",
    },

    leverage: {
      type: Number,
      default: null, // only for place-order-with-leverage
    },

    // ─── POSITION specific ────────────────────────────────────────────
    positionId: {
      type: String,
      default: null, // required if placeType is POSITION
      trim: true,
    },

    // ─── Order Status ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "pending",    // order created locally, not yet sent to Pi42
        "placed",     // successfully placed on Pi42
        "filled",     // fully executed
        "partial",    // partially filled
        "cancelled",  // cancelled
        "rejected",   // rejected by Pi42
        "failed",     // error while placing
      ],
      default: "pending",
      index: true,
    },

    // ─── Pi42 Raw Response ────────────────────────────────────────────
    // pi42Response: {
    //   type: Schema.Types.Mixed,
    //   default: null, // store full Pi42 response for debugging/reconciliation
    // },

    // ─── Error Tracking ───────────────────────────────────────────────
    // errorMessage: {
    //   type: String,
    //   default: null, // populated if status is failed or rejected
    // },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
pi42OrderSchema.index({ user: 1, status: 1 });
pi42OrderSchema.index({ user: 1, symbol: 1 });
pi42OrderSchema.index({ pi42Account: 1, createdAt: -1 });
pi42OrderSchema.index({ positionId: 1 });

const Pi42Order = mongoose.model("Pi42Order", pi42OrderSchema);

module.exports = Pi42Order;