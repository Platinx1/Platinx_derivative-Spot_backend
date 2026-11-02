const mongoose = require("mongoose");

const syncStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true }, // unix ms
  },
  { timestamps: true }
);

const CoinswitchSyncState = mongoose.model("CoinswitchSyncState", syncStateSchema);
module.exports = CoinswitchSyncState;