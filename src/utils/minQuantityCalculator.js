/**
 * Minimum Quantity Calculator for Pi42
 * Based on MIN_NOTIONAL + quantityPrecision
 */

function roundUp(num, precision) {
  const factor = Math.pow(10, precision);
  return Math.ceil(num * factor) / factor;
}

/**
 * Calculate Minimum Quantity
 * @param {number} notionalVal - MIN_NOTIONAL value from exchangeInfo (e.g. 8780)
 * @param {number} marketPrice - Current market price of the pair
 * @param {number} quantityPrecision - quantityPrecision from exchangeInfo (e.g. 3)
 * @returns {number} - Final minimum quantity
 */
function calculateMinQuantity(notionalVal, marketPrice, quantityPrecision) {
  if (!notionalVal || !marketPrice || marketPrice <= 0) {
    throw new Error("Invalid notionalVal or marketPrice");
  }

  // Step 1: Raw calculation
  let minQty = notionalVal / marketPrice;

  // Step 2: Round Up according to precision
  const finalMinQty = roundUp(minQty, quantityPrecision);

  return finalMinQty;
}

module.exports = calculateMinQuantity;