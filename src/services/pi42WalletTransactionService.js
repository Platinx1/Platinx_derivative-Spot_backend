
const axios = require("axios");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const buildHeaders = require("../utils/buildHeaders");
const { getPi42UserByAccountId } = require("./pi42UserService");

const Pi42WalletTransaction = require("../models/pi42Models/pi42WalletTransaction");
const { toDecimal128 } = require("../models/pi42Models/decimal"); // adjust path if needed


exports.createDepositTransaction = async (
  pi42AccountId,
  pi42Response,
  requestedAmount,
  referenceId
) => {
  if (!pi42Response || !pi42Response.orderId) {
    throw new Error("Invalid Pi42 deposit response");
  }

  const transactionData = {
    pi42Account: pi42AccountId,

    transactionId: pi42Response.orderId,           // Pi42's orderId
    referenceId: referenceId,

    type: "DEPOSIT",

    paymentStatus: "SUCCESS",                      // Since API returned success

    amount: toDecimal128(requestedAmount),         // Amount user requested
    amountCredited: toDecimal128(requestedAmount), // Assuming full credit for now
    fee: toDecimal128("0"),

    asset: "INR",

    pi42TransactionTime: new Date(),
  };

  const newTransaction = new Pi42WalletTransaction(transactionData);
  return await newTransaction.save();
};

exports.createWithdrawalTransaction = async (
  pi42AccountId,
  pi42Response,
  requestedAmount,
  referenceId
) => {
  if (!pi42Response || !pi42Response.orderId) {
    throw new Error("Invalid Pi42 withdrawal response");
  }

  const transactionData = {
    pi42Account: pi42AccountId,

    transactionId: pi42Response.orderId,           // Pi42's orderId
    referenceId: referenceId,

    type: "WITHDRAWAL",

    paymentStatus: "SUCCESS",                      // Since API returned success

    amount: toDecimal128(requestedAmount),         // Amount requested to withdraw
    amountDebited: toDecimal128(requestedAmount),  // Amount debited from wallet
    fee: toDecimal128("0"),                        // Update later if Pi42 returns fee

    asset: "INR",

    pi42TransactionTime: new Date(),
  };

  const newTransaction = new Pi42WalletTransaction(transactionData);
  return await newTransaction.save();
};


exports.createPi42WalletTransactionsFromTrade = async (pi42AccountId, tradeData) => {
  const tradeId = tradeData.tradeId;
  if (!tradeId) {
    console.warn("⚠️ No tradeId found in newTrade event");
    return;
  }

  // Step 1: User details le lo (headers ke liye)
  const user = await getPi42UserByAccountId(tradeData.accountId);
  if (!user) {
    console.warn("⚠️ No Pi42 user found for accountId:", tradeData.accountId);
    return;
  }

  const endpoint = `/v1/user-data/transaction-history`;
  const url = `${process.env.PI42_PILOT_BASE_URL}${endpoint}`;

  const headers = buildHeaders(
    process.env.PARTNER_NAME,
    process.env.API_COOKIE,
    String(user.pi42UserId),
    String(user.pi42AccountId)
  );

  const params = {
    tradeId: Number(tradeId),
    pageSize: 10,     // tradeId pass karne par usually sirf 1-3 records aate hain
  };

  let responseData;
  try {
    const apiRes = await axios.get(url, { headers, params });
    responseData = apiRes.data;
  } catch (err) {
    console.error(
      `❌ Failed to fetch transaction history for tradeId ${tradeId}:`,
      err?.response?.data || err.message
    );
    return; // fail silently ya throw kar sakte ho
  }

  const transactions = responseData?.data || [];
  if (transactions.length === 0) {
    console.log(`ℹ️ No transactions found for tradeId ${tradeId}`);
    return;
  }

  // Step 2: Model ke hisaab se documents banao
  const docs = transactions.map((tx) => ({
    pi42Account: pi42AccountId,

    transactionId: String(tx.id), // Pi42 ka unique id
    referenceId: tx.referenceId || null,

    type: tx.type, // COMMISSION, GST_ON_COMMISSION, etc.

    paymentStatus: tx.paymentStatus || null,
    adminRemarks: tx.adminRemarks || null,

    // Amount fields
    amount: toDecimal128(tx.amount || 0),
    fee: toDecimal128(tx.fee ?? 0),
    amountCredited: toDecimal128(tx.amount > 0 ? tx.amount : 0),
    amountDebited: toDecimal128(tx.amount < 0 ? Math.abs(tx.amount) : 0),

    asset: (tx.marginAsset || tx.asset || "INR").toUpperCase(),

    // Linked entities
    contractPair: tx.contractPair || tradeData.symbol,
    positionId: tx.positionId || tradeData.positionId,
    orderId: tx.orderId || null,
    tradeId: Number(tx.tradeId || tradeId),

    // Timestamp
    pi42TransactionTime: tx.time || tx.updatedAt || tx.createdAt
      ? new Date(tx.time || tx.updatedAt || tx.createdAt)
      : new Date(),

    isDeleted: false,
  }));

  // Step 3: Bulk insert (fast & atomic)
  try {
    await Pi42WalletTransaction.insertMany(docs, { ordered: false });
    console.log(`✅ ${docs.length} wallet transactions saved for tradeId ${tradeId}`);
  } catch (err) {
    console.error("❌ WalletTransaction insertMany failed:", err.message);
    // agar duplicate key error aaye toh ignore kar sakte ho (unique index hai)
  }
};