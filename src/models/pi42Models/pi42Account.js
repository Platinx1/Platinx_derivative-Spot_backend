const mongoose = require("mongoose");
const { Schema } = mongoose;

const pi42AccountSchema = new Schema(
  {
    user: {
      type: String,
      required: true,
      index: true,
    },
    refId: { type: String, required: true, unique: true }, // Platinx ka reference
    pi42UserId: { type: Number, required: true, unique: true },
    pi42AccountId: { type: Number, required: true, unique: true },

    // Preferences (leverage, auto top-up, etc.)
    // defaultLeverage: { type: Number, default: 10 },
    autoTopUpEnabled: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

pi42AccountSchema.index({ user: 1 });
pi42AccountSchema.index({ pi42UserId: 1 });
pi42AccountSchema.index({ pi42AccountId: 1 });
pi42AccountSchema.index({ isDeleted: 1 });

const Pi42Account = mongoose.model("Pi42Account", pi42AccountSchema);
module.exports = Pi42Account;