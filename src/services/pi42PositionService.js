const Pi42Position = require("../models/pi42Models/pi42Position");
const { toDecimal128 } = require("../models/pi42Models/decimal");


exports.createPi42PositionFromSocket = async (pi42AccountId, positionData) => {
  if (!positionData || !positionData.positionId) {
    throw new Error("Invalid position data: positionId is required");
  }

  const positionDoc = {
    pi42Account: pi42AccountId,

    positionId: positionData.positionId,

    // Contract Info
    contractPair: positionData.contractPair,
    baseAsset: positionData.baseAsset,
    quoteAsset: positionData.quoteAsset,

    // Position Details
    positionType: positionData.positionType,
    positionStatus: positionData.positionStatus || "OPEN",

    entryPrice: toDecimal128(positionData.entryPrice),
    liquidationPrice: toDecimal128(positionData.liquidationPrice),

    quantity: toDecimal128(positionData.quantity),
    positionAmount: toDecimal128(positionData.positionAmount),
    positionSize: toDecimal128(positionData.positionSize),

    // Margin
    marginType: positionData.marginType || "ISOLATED",
    marginAsset: positionData.marginAsset,
    margin: toDecimal128(positionData.margin),
    marginInMarginAsset: toDecimal128(positionData.marginInMarginAsset),

    marginConversionRate: toDecimal128(positionData.marginConversionRate),
    marginSettlementRate: toDecimal128(positionData.marginSettlementRate),
    maintenanceMarginPercentage: toDecimal128(positionData.maintenanceMarginPercentage),

    leverage: positionData.leverage,

    // PnL
    realizedProfit: toDecimal128(positionData.realizedProfit),
    realizedProfitInMarginAsset: toDecimal128(positionData.realizedProfitInMarginAsset || 0),

    autoTopUpEnabled: positionData.autoTopUpEnabled || false,

    // Timestamp
    pi42CreatedAt: positionData.eventTime 
      ? new Date(parseInt(positionData.eventTime) / 1000000) // convert nano to ms if needed
      : new Date(positionData.tradeTime || Date.now()),

    isDeleted: false,
  };

  const newPosition = new Pi42Position(positionDoc);
  return await newPosition.save();
};


exports.updatePi42PositionFromSocket = async (pi42AccountId, positionData) => {
  if (!positionData?.positionId) {
    throw new Error("Invalid position update data");
  }

  const updateData = {
    positionStatus: positionData.positionStatus,

    entryPrice: toDecimal128(positionData.entryPrice),
    liquidationPrice: toDecimal128(positionData.liquidationPrice),

    quantity: toDecimal128(positionData.quantity),
    positionAmount: toDecimal128(positionData.positionAmount),
    positionSize: toDecimal128(positionData.positionSize),

    margin: toDecimal128(positionData.margin),
    marginInMarginAsset: toDecimal128(positionData.marginInMarginAsset),

    realizedProfit: toDecimal128(positionData.realizedProfit),
    realizedProfitInMarginAsset: toDecimal128(positionData.realizedProfitInMarginAsset),

    leverage: positionData.leverage,
    autoTopUpEnabled: positionData.autoTopUpEnabled,

    pi42UpdatedAt: new Date(),   // You can add this field in model if needed
  };

  const updatedPosition = await Pi42Position.findOneAndUpdate(
    { 
      pi42Account: pi42AccountId,
      positionId: positionData.positionId,
      isDeleted: false 
    },
    updateData,
    { new: true }
  );

  return updatedPosition;
};


exports.closePi42PositionFromSocket = async (pi42AccountId, positionData) => {
  if (!positionData?.positionId) {
    throw new Error("Invalid close position data: positionId is required");
  }

  const updateData = {
    positionStatus: positionData.positionStatus,
    realizedProfit: toDecimal128(positionData.realizedProfit),
    realizedProfitInMarginAsset: toDecimal128(positionData.realizedProfitInMarginAsset || 0),

    quantity: toDecimal128(positionData.quantity || 0),
    positionAmount: toDecimal128(positionData.positionAmount || 0),
    positionSize: toDecimal128(positionData.positionSize || 0),

    margin: toDecimal128(positionData.margin || 0),
    marginInMarginAsset: toDecimal128(positionData.marginInMarginAsset || 0),

    autoTopUpEnabled: positionData.autoTopUpEnabled || false,
    pi42UpdatedAt: new Date(),
  };

  const closedPosition = await Pi42Position.findOneAndUpdate(
    { 
      pi42Account: pi42AccountId,
      positionId: positionData.positionId,
      isDeleted: false 
    },
    updateData,
    { new: true }
  );

  return closedPosition;
};