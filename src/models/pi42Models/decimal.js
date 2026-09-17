// const mongoose = require("mongoose");

// const toDecimal128 = (value) => {
//   if (value === null || value === undefined) return null;
//   return mongoose.Types.Decimal128.fromString(String(value));
// };

// const decimalGetter = (value) => (value ? value.toString() : null);

// const decimalSetter = (value) => {
//   if (value === null || value === undefined) return null;
//   return mongoose.Types.Decimal128.fromString(String(value));
// };

// const D = (defaultValue = "0") => ({
//   type: mongoose.Schema.Types.Decimal128,
//   default: () => mongoose.Types.Decimal128.fromString(String(defaultValue)),
//   get: decimalGetter,
//   set: decimalSetter,
// });

// module.exports = { D, decimalGetter, toDecimal128 };



const mongoose = require("mongoose");
const Decimal = require("decimal.js");

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

const cleanDecimalString = (value, decimals = 8) => {
  if (value === null || value === undefined) return "0";
  try {
    const strVal = typeof value === "object" && value !== null ? value.toString() : String(value);
    return new Decimal(strVal).toFixed(decimals).replace(/\.?0+$/, "") || "0";
  } catch (err) {
    return "0";
  }
};

const toDecimal128 = (value, decimals = 8) => {
  if (value === null || value === undefined) return null;
  const cleanStr = cleanDecimalString(value, decimals);
  return mongoose.Types.Decimal128.fromString(cleanStr);
};

const decimalGetter = (value) => (value ? value.toString() : "0");

const decimalSetter = (value) => {
  if (value === null || value === undefined) return null;
  const cleanStr = cleanDecimalString(value, 8);
  return mongoose.Types.Decimal128.fromString(cleanStr);
};

const D = (defaultValue = "0") => ({
  type: mongoose.Schema.Types.Decimal128,
  default: () => mongoose.Types.Decimal128.fromString(String(defaultValue)),
  get: decimalGetter,
  set: decimalSetter,
});

module.exports = { D, decimalGetter, decimalSetter, toDecimal128, cleanDecimalString };