// services/pi42OrderService.js
const Pi42Order = require("../models/pi42Models/pi42Order");
const { toDecimal128 } = require("../models/pi42Models/decimal"); // adjust path if needed

/**
 * Creates a Pi42Order document from Pi42 API response
 * @param {String|ObjectId} pi42AccountId - Pi42 Account ID
 * @param {Object} pi42Data - Raw order object from Pi42 API
 * @returns {Promise<Object>} Saved order document
 */
exports.createPi42Order = async (pi42AccountId, pi42Data) => {
  const orderData = {
    pi42Account: pi42AccountId,

    orderId: pi42Data.id,
    clientOrderId: pi42Data.clientOrderId,

    contractPair: pi42Data.symbol || pi42Data.contractPair,
    contractType: pi42Data.contractType,
    type: pi42Data.type,
    side: pi42Data.side,

    subType: pi42Data.subType || "PRIMARY",
    linkType: pi42Data.linkType || "ORDER",
    linkId: pi42Data.linkId,

    price: toDecimal128(pi42Data.price),
    stopPrice: toDecimal128(pi42Data.stopPrice),
    orderAmount: toDecimal128(pi42Data.orderAmount || pi42Data.origQty),
    filledAmount: toDecimal128(pi42Data.filledAmount || "0"),
    avgPrice: toDecimal128(pi42Data.avgPrice),

    lockedMargin: toDecimal128(pi42Data.lockedMargin || "0"),
    
    reduceOnly: pi42Data.reduceOnly || false,
    placeType: pi42Data.placeType,

    leverage: pi42Data.leverage,
    baseAsset: pi42Data.baseAsset,
    quoteAsset: pi42Data.quoteAsset || "INR",
    marginAsset: pi42Data.marginAsset,
    marginConversionRate: toDecimal128(pi42Data.marginConversionRate || "1"),

    positionId: pi42Data.positionId,
    refId: pi42Data.refId,

    pi42CreatedAt: pi42Data.time ? new Date(pi42Data.time) : null,
    pi42UpdatedAt: pi42Data.updatedAt ? new Date(pi42Data.updatedAt) : null,
  };

  const newOrder = new Pi42Order(orderData);
  return await newOrder.save();
};

exports.cancelPi42Order = async (clientOrderId) => {
  await Pi42Order.findOneAndUpdate(
    { clientOrderId, isDeleted: false },
    { status: "CANCELED", pi42UpdatedAt: new Date() },
    { new: true }
  ).exec();
}

exports.cancelAllPi42Orders = async (pi42AccountId, filters = {}) => {
  const { symbols, baseAsset, marginAsset } = filters;

  // Build dynamic query
  const query = {
    pi42Account: pi42AccountId,
    status: { $in: ["NEW", "PARTIALLY_FILLED"] }, // Only open orders
    isDeleted: false,
  };

  // Add optional filters
  if (symbols && Array.isArray(symbols) && symbols.length > 0) {
    query.contractPair = { $in: symbols.map(s => s.toUpperCase().trim()) };
  }

  if (baseAsset) {
    query.baseAsset = baseAsset.toUpperCase().trim();
  }

  if (marginAsset) {
    query.marginAsset = marginAsset.toUpperCase().trim();
  }

  // Update orders to canceled + soft delete
  const result = await Pi42Order.updateMany(
    query,
    {
      $set: {
        status: "CANCELED",
        isDeleted: true,
        pi42UpdatedAt: new Date(),
      },
    },
    { new: true }
  );

  return result;
};

exports.cancelPi42OrderFromSocket = async (pi42Data) => {

  console.log(":::::rejected::::::", pi42Data);
  await Pi42Order.findOneAndUpdate(
    { clientOrderId : pi42Data.clientOrderId },
    {
      status: pi42Data.status, // "CANCELED"
      filledAmount: toDecimal128(pi42Data.filledAmount || pi42Data.executedAmount || 0),
      avgPrice: toDecimal128(pi42Data.avgPrice),
      pi42UpdatedAt: new Date(pi42Data.updateTime || pi42Data.time),

      // Extra fields jo event mein aa rahe hain
      baseAsset: pi42Data.baseAsset,
      quoteAsset: pi42Data.quoteAsset,
      contractType: pi42Data.contractType,
      marginAsset: pi42Data.marginAsset,
      marginConversionRate: toDecimal128(pi42Data.marginConversionRate),
    },
    { new: true }
  ).exec();
}

exports.updatePartiallyFilledPi42OrderFromSocket = async (pi42Data) => {
  if (!pi42Data || !pi42Data.clientOrderId) {
    throw new Error("Invalid order event data: clientOrderId is required");
  }

  const updateData = {
    status: pi42Data.status,

    // Important fields to update on partial fill / fill
    filledAmount: toDecimal128(pi42Data.filledAmount || pi42Data.executedAmount || pi42Data.cumQty || 0),
    avgPrice: toDecimal128(pi42Data.avgPrice || pi42Data.executedPrice),
    
    // Optional but useful
    price: toDecimal128(pi42Data.price),

    pi42UpdatedAt: new Date(pi42Data.updateTime || pi42Data.time),

    // Extra fields from event
    baseAsset: pi42Data.baseAsset,
    quoteAsset: pi42Data.quoteAsset,
    contractType: pi42Data.contractType,
    marginAsset: pi42Data.marginAsset,
    marginConversionRate: toDecimal128(pi42Data.marginConversionRate),

    // Link fields (in case they come)
    linkId: pi42Data.linkId,
    linkType: pi42Data.linkType,
    subType: pi42Data.subType,
    placeType: pi42Data.placeType,
  };

  // If order is fully filled, we can also update orderAmount if needed (optional)
  if (pi42Data.status === "FILLED") {
    updateData.orderAmount = toDecimal128(pi42Data.orderAmount);
  }

  const updatedOrder = await Pi42Order.findOneAndUpdate(
    { 
      clientOrderId: pi42Data.clientOrderId, 
      isDeleted: false 
    },
    updateData,
    { 
      new: true,
    }
  ).exec();

  return updatedOrder;
};

exports.updateFilledPi42OrderFromSocket = async (pi42Data) => {
  if (!pi42Data?.clientOrderId) {
    throw new Error("Invalid order event data: clientOrderId is required");
  }

  const updatePayload = {
    status: pi42Data.status,

    // Core fields that change on fill / partial fill
    filledAmount: toDecimal128(
      pi42Data.filledAmount || 
      pi42Data.executedAmount || 
      pi42Data.cumQty || 
      0
    ),

    avgPrice: toDecimal128(pi42Data.avgPrice || pi42Data.executedPrice),

    // Original order details (useful for MARKET orders where price comes later)
    price: toDecimal128(pi42Data.price),

    // Update orderAmount when we get full fill (especially for MARKET orders)
    ...(pi42Data.status === "FILLED" && {
      orderAmount: toDecimal128(pi42Data.orderAmount),
    }),

    // Timestamps
    pi42UpdatedAt: new Date(pi42Data.updateTime || pi42Data.time),

    // Extra fields from event
    contractPair: pi42Data.symbol || pi42Data.contractPair,
    baseAsset: pi42Data.baseAsset,
    quoteAsset: pi42Data.quoteAsset,
    contractType: pi42Data.contractType,
    marginAsset: pi42Data.marginAsset,
    marginConversionRate: toDecimal128(pi42Data.marginConversionRate),

    linkId: pi42Data.linkId,
    linkType: pi42Data.linkType,
    subType: pi42Data.subType,
    placeType: pi42Data.placeType,

    // In case orderId is sent
    // orderId: pi42Data.orderId,
  };

  const updatedOrder = await Pi42Order.findOneAndUpdate(
    {
      clientOrderId: pi42Data.clientOrderId,
      isDeleted: false,
    },
    updatePayload,
    {
      new: true,           // Return the updated document
      runValidators: true,
    }
  ).exec();

  return updatedOrder;
};

exports.handleOrderFailed = async (pi42Data) => {
  try {
    const updateData = {
      status: pi42Data.status,
      pi42UpdatedAt: new Date(pi42Data.updateTime || pi42Data.time || Date.now()),

      // Extra fields jo event mein aa rahe hain
      price: toDecimal128(pi42Data.price),
      stopPrice: toDecimal128(pi42Data.stopPrice),
      orderAmount: toDecimal128(pi42Data.orderAmount),
      filledAmount: toDecimal128(pi42Data.filledAmount || 0),
      avgPrice: toDecimal128(pi42Data.avgPrice),
      leverage: pi42Data.leverage,
      baseAsset: pi42Data.baseAsset,
      quoteAsset: pi42Data.quoteAsset,
      marginAsset: pi42Data.marginAsset,
      marginConversionRate: toDecimal128(pi42Data.marginConversionRate),
      lockedMargin: toDecimal128(pi42Data.lockedMargin),
      lockedMarginInMarginAsset: toDecimal128(pi42Data.lockedMarginInMarginAsset),

      // Error reason store karna accha practice hai
      errorMessage: pi42Data.reason || "Order rejected by exchange",
    };

    const updatedOrder = await Pi42Order.findOneAndUpdate(
      { clientOrderId: pi42Data.clientOrderId },
      updateData,
      { 
        new: true, 
        upsert: false
      }
    );

    if (!updatedOrder) {
      console.warn(`Order not found for clientOrderId: ${pi42Data.clientOrderId}`);
    }

    return updatedOrder;
  } catch (error) {
    console.error("Error handling orderFailed event:", error);
    throw error;
  }
};
