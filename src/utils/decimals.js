const mongoose = require("mongoose");

const D = (defaultValue = "0") => ({
  type: mongoose.Schema.Types.Decimal128,
  default: () => mongoose.Types.Decimal128.fromString(defaultValue),
});

const decimalGetter = (value) => {
  if (!value) return value;
  return value.toString();
};

module.exports = { D, decimalGetter };
