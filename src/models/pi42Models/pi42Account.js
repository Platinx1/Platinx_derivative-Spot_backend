const mongoose = require("mongoose");

const { Schema } = mongoose;

const pi42AccountSchema = new Schema(
  {
    // Reference to your platform's user
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Payload sent to Pi42
    refId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Response from Pi42
    pi42AccountId: {
      type: Number,
      required: true,
      unique: true,
    },

    pi42UserId: {
      type: Number,
      required: true,
      unique: true,
    },

    // Account status
    status: {
      type: String,
      enum: ["active", "suspended", "closed"],
      default: "active",
    },

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

// Compound index for quick lookup
pi42AccountSchema.index({ pi42AccountId: 1, pi42UserId: 1 });

const Pi42Account = mongoose.model("Pi42Account", pi42AccountSchema);
module.exports = Pi42Account;