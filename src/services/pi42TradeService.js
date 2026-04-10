const Pi42Trade = require("../models/pi42Models/pi42Trade");
const { toDecimal128 } = require("../models/pi42Models/decimal");

exports.createPi42TradeFromSocket = async (pi42AccountId, tradeData) => {
  const tradeDoc = {
    pi42Account: pi42AccountId,

    tradeId: tradeData.tradeId,
    clientOrderId: tradeData.clientOrderId,
    positionId: tradeData.positionId,

    contractPair: tradeData.symbol,

    price: toDecimal128(tradeData.executedPrice),
    quantity: toDecimal128(tradeData.executedQuantity),

    side: tradeData.side,
    tradeRole: tradeData.role,

    realizedPnl: toDecimal128(tradeData.realizedPnl),
    commission: toDecimal128(tradeData.fee),
    commissionAsset: tradeData.market || tradeData.marginAsset,

    feeInMarginAsset: toDecimal128(tradeData.feeInMarginAsset),
    realizedPnlInMarginAsset: toDecimal128(tradeData.realizedPnlInMarginAsset),

    marginAsset: tradeData.marginAsset,
    marginConversionRate: toDecimal128(tradeData.marginConversionRate),
    marginSettlementRate: toDecimal128(tradeData.marginSettlementRate),

    clearanceFee: toDecimal128(tradeData.clearanceFee),
    clearanceFeeInMarginAsset: toDecimal128(tradeData.clearanceFeeInMarginAsset),

    pi42TradeTime: new Date(tradeData.tradeTime),

    isDeleted: false,
  };

  const newTrade = new Pi42Trade(tradeDoc);
  return await newTrade.save();
};