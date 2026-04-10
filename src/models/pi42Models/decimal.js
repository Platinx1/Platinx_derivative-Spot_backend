// models/decimal.js
const mongoose = require("mongoose");

const toDecimal128 = (value) => {
  if (value === null || value === undefined) return null;
  return mongoose.Types.Decimal128.fromString(String(value));
};

const decimalGetter = (value) => (value ? value.toString() : null);

const decimalSetter = (value) => {
  if (value === null || value === undefined) return null;
  return mongoose.Types.Decimal128.fromString(String(value));
};

const D = (defaultValue = "0") => ({
  type: mongoose.Schema.Types.Decimal128,
  default: () => mongoose.Types.Decimal128.fromString(String(defaultValue)),
  get: decimalGetter,
  set: decimalSetter,
});

module.exports = { D, decimalGetter, toDecimal128 };