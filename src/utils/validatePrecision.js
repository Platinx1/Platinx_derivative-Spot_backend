const validatePrecision = (value, precision) => {
  if (value === undefined || value === null) return true;

  const valueStr = value.toString();

  if (!valueStr.includes(".")) {
    return true;
  }

  const decimalPart = valueStr.split(".")[1] || "";

  return decimalPart.length <= precision;
};

module.exports = validatePrecision;