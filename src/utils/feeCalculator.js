const Decimal = require("decimal.js");
const FeeConfig = require("../models/feeConfigurationSchema");

async function calculateTradeFees({
  marketType,
  tradeVolume,
  liquidityType = "TAKER",
}) {
  // 1️⃣ Fetch fee config from DB
  const feeConfig = await FeeConfig.findOne({
    marketType,
    isActive: true,
  }).lean();

  if (!feeConfig) {
    throw new Error(`Fee config not found for ${marketType}`);
  }

  // 2️⃣ Convert to Decimal for precision
  const volume = new Decimal(tradeVolume);

  // 3️⃣ Determine fee rate based on maker/taker
  let feeRate;
  if (liquidityType === "MAKER") {
    feeRate = new Decimal(feeConfig.makerFeeRate);
  } else {
    feeRate = new Decimal(feeConfig.takerFeeRate);
  }

  // 4️⃣ Calculate platform fee
  const platformFee = volume.times(feeRate);

  // 5️⃣ Calculate GST (18%)
  const gstRate = new Decimal(feeConfig.gstRate);
  const gstAmount = platformFee.times(gstRate);

  // 6️⃣ Calculate exchange fee (what you pay to CoinSwitch)
  const exchangeFeeRate = new Decimal(feeConfig.exchangeFeeRate);
  const exchangeFee = volume.times(exchangeFeeRate);

  // 7️⃣ Calculate net revenue (your actual profit)
  const netRevenue = platformFee.minus(exchangeFee);

  // 8️⃣ Total fee charged to user
  const totalFeeChargedToUser = platformFee.plus(gstAmount);

  return {
    tradeVolume: volume.toFixed(8),
    platformFee: platformFee.toFixed(8),
    gstAmount: gstAmount.toFixed(8),
    exchangeFee: exchangeFee.toFixed(8),
    netRevenue: netRevenue.toFixed(8),
    totalFeeChargedToUser: totalFeeChargedToUser.toFixed(8),
    feeRate: feeRate.toFixed(6),
    gstRate: gstRate.toFixed(4),
    liquidityType,
  };
}

module.exports = { calculateTradeFees };
