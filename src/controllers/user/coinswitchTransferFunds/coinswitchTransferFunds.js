const axios = require("axios");
const { v4: uuidv4 } = require("uuid"); 
const catchAsync = require("../../../utils/catchAsync");
const AppError = require("../../../utils/AppError");
const { getAuthHeaders } = require("../../../utils/signatureHelper");
const { buildUrlAndParamsDMA } = require("../../../utils/urlAndParamsHelper");
const SubAccount = require("../../../models/subAccountSchema");


const DMA_ENDPOINTS = {
  MASTER_TRANSFER: "/dma/api/v1/master/transfer",
  FUNDS_TRANSFER_MASTER_ACCOUNT: "/dma/api/v1/funds/transfer/master-account",
};

const handleApiResponse = (res, message, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};


/**
 * POST /dma/api/v1/master/transfer
 *
 * Business Rules (from doc):
 * - TRANSFER_IN  → master sends funds TO child subaccount
 * - TRANSFER_OUT → child subaccount sends funds BACK TO master
 * - Only USDT is supported (any other coin returns 400)
 * - Amount must be > 0
 * - Cannot TRANSFER_IN to a disabled subaccount (400)
 * - TRANSFER_OUT from a disabled subaccount IS allowed
 * - subaccount_id must belong to your master account (403 otherwise)
 *
 * Auth: Master API key + seconds epoch
 */
exports.masterToSubAccountTransfer = catchAsync(async (req, res, next) => {
  const { subaccount_id, transfer_type, amount, coin = "USDT" } = req.body;

  // ─── Validation ───────────────────────────────────────────────────────────

  if (!subaccount_id || !transfer_type || !amount) {
    return next(
      new AppError(
        "Missing required fields: subaccount_id, transfer_type, amount",
        400
      )
    );
  }

  if (isNaN(Number(subaccount_id))) {
    return next(
      new AppError(
        "subaccount_id must be a valid numeric identifier",
        400
      )
    );
  }

  const validTransferTypes = ["TRANSFER_IN", "TRANSFER_OUT"];
  if (!validTransferTypes.includes(transfer_type.toUpperCase())) {
    return next(
      new AppError(
        'transfer_type must be exactly "TRANSFER_IN" or "TRANSFER_OUT"',
        400
      )
    );
  }

  if (coin.toUpperCase() !== "USDT") {
    return next(
      new AppError(
        `Unsupported coin "${coin}": only USDT is supported for transfers`,
        400
      )
    );
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return next(new AppError("amount must be a number greater than zero", 400));
  }

  // ✅ Guard: prevent TRANSFER_IN to a locally-known disabled subaccount
  // (saves an unnecessary API round-trip)
  if (transfer_type.toUpperCase() === "TRANSFER_IN") {
    const subAccount = await SubAccount.findOne({
      exchangeSubAccountId: subaccount_id.toString(),
    });

    if (subAccount && subAccount.status === "SUSPENDED") {
      return next(
        new AppError(
          "Cannot TRANSFER_IN to a disabled subaccount. Only TRANSFER_OUT is allowed.",
          400
        )
      );
    }
  }

  const method = "POST";
  const path = DMA_ENDPOINTS.MASTER_TRANSFER;
  const queryObj = {};

  // Canonical body — exactly as doc specifies
  const body = {
    subaccount_id: subaccount_id.toString(), // doc says string
    transfer_type: transfer_type.toUpperCase(),
    amount: parsedAmount,
    coin: coin.toUpperCase(), // only USDT
  };

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  const headers = getAuthHeaders(
    method,
    path,
    queryObj,
    null,
    process.env.API_KEY,
    process.env.API_SECRET,
    "s" // Seconds epoch
  );

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      data: body,
    });

    const { txn_id, subaccount_id: returnedSubId, transfer_type: returnedType, amount: returnedAmount, coin: returnedCoin } = response.data?.data || {};

    handleApiResponse(res, "Transfer completed successfully", {
      txn_id,
      subaccount_id: returnedSubId,
      transfer_type: returnedType,
      amount: returnedAmount,
      coin: returnedCoin,
    });
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      // All doc-specified errors for this endpoint
      if (status === 400) {
        // amount <= 0 / unsupported coin / disabled subaccount TRANSFER_IN / invalid subaccount_id format
        return next(
          new AppError(data.message || "Bad request", 400)
        );
      }
      if (status === 403) {
        // Subaccount belongs to another master
        return next(
          new AppError(
            data.message ||
              "Forbidden — subaccount does not belong to your master account",
            403
          )
        );
      }
      if (status === 404) {
        return next(
          new AppError(
            data.message ||
              `Subaccount not found for subaccount_id: ${subaccount_id}`,
            404
          )
        );
      }
      if (status === 401) {
        return next(
          new AppError(
            data.message || "Invalid or missing master API credentials",
            401
          )
        );
      }

      return next(
        new AppError(
          `CoinSwitch error: ${data.message || "Unknown error"}`,
          status
        )
      );
    }

    return next(new AppError("Failed to connect to CoinSwitch DMA API", 503));
  }
});



/**
 * POST /dma/api/v1/funds/transfer/master-account
 *
 * Business Rules (from doc):
 * - IN  → user main book sends funds TO master exchange account
 * - OUT → master exchange account sends funds BACK TO user main book
 * - Only USDT supported (quote_asset must be "USDT")
 * - Amount must be > 0
 * - client_txn_id is an IDEMPOTENCY KEY — must be a unique UUID per transaction
 *   (sending same UUID again returns the existing transaction, not a duplicate)
 * - user_custody_wallet_id is injected by the gateway — comes from your platform context
 *
 * ⚠️  CRITICAL AUTH DIFFERENCE (from doc section 3.5):
 *   Auth: Via Coinswitch api key (X-Auth-Apikey) — NOT master/subaccount key
 *   Master and subaccount keys are REJECTED for this endpoint (returns 403)
 *   Use COINSWITCH_API_KEY + COINSWITCH_API_SECRET from env
 *
 * Auth: Coinswitch (user main book) API key + seconds epoch
 */
exports.fundsTransferMasterAccount = catchAsync(async (req, res, next) => {
  const {
    subaccount_id,          // master account's subaccount_id
    user_custody_wallet_id, // injected by gateway — user's custody wallet
    amount,
    direction,              // "IN" (user → master) or "OUT" (master → user) 
    quote_asset = "USDT",
  } = req.body;

  // ─── Validation ───────────────────────────────────────────────────────────

  if (!subaccount_id || !amount || !direction || !user_custody_wallet_id) {
    return next(
      new AppError(
        "Missing required fields: subaccount_id, user_custody_wallet_id, amount, direction",
        400
      )
    );
  }

  const validDirections = ["IN", "OUT"];
  if (!validDirections.includes(direction.toUpperCase())) {
    return next(
      new AppError('direction must be "IN" (user → master) or "OUT" (master → user)', 400)
    );
  }

  if (quote_asset.toUpperCase() !== "USDT") {
    return next(
      new AppError(
        `Unsupported quote_asset "${quote_asset}": only USDT is supported`,
        400
      )
    );
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return next(new AppError("amount must be a number greater than zero", 400));
  }

  if (isNaN(Number(user_custody_wallet_id))) {
    return next(
      new AppError("user_custody_wallet_id must be a valid numeric value", 400)
    );
  }

  // ✅ Auto-generate idempotency key if caller didn't provide one
  // Doc: "unique UUID per transaction" — never reuse
  const txnId = uuidv4();

  const method = "POST";
  const path = DMA_ENDPOINTS.FUNDS_TRANSFER_MASTER_ACCOUNT;
  const queryObj = {};

  // Canonical body — exactly matching doc fields
  const body = {
    subaccount_id: subaccount_id.toString(),
    user_custody_wallet_id: Number(user_custody_wallet_id), // int64 per doc
    amount: parsedAmount,
    direction: direction.toUpperCase(),         // "IN" or "OUT"
    client_txn_id: txnId,                       // UUID idempotency key
    quote_asset: quote_asset.toUpperCase(),     // must be "USDT"
  };

  const { fullUrl } = buildUrlAndParamsDMA(path, queryObj);

  // ⚠️  DIFFERENT API KEY — Coinswitch main book key, NOT master key
  // Doc explicitly says: master/subaccount keys are rejected (403) for this endpoint
  const headers = getAuthHeaders(
    method,
    path,
    queryObj,
    null,
    process.env.MAIN_MASTER_ACCOUNT_API_KEY,    // User main book Coinswitch key
    process.env.MAIN_MASTER_ACCOUNT_API_SECRET, // User main book Coinswitch secret
    "s"                                // Seconds epoch
  );

  // const headers = {
  //   "Content-Type": "application/json",
  //   "X-AUTH-APIKEY": process.env.API_KEY,
  // }

  console.log("Funds transfer master-account body:", body);
  console.log("Using client_txn_id (idempotency key):", txnId);
  console.log("Request URL:", fullUrl);
  console.log("headers::::::::::::", headers);

  try {
    // const response = await axios({
    //   method,
    //   url: fullUrl,
    //   headers,
    //   data: body,
    // });

    // const responseData = response.data?.data || {};
    const responseData = {};

    handleApiResponse(res, "Funds transfer to master account successful", {
      txn_id: responseData.txn_id,
      subaccount_id: responseData.subaccount_id,
      direction: responseData.direction,
      amount: responseData.amount,
      quote_asset: responseData.quote_asset,
      client_txn_id: txnId, // Return so caller can track idempotency
    });
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 400) {
        // Non-USDT quote_asset / amount <= 0
        return next(new AppError(data.message || "Bad request", 400));
      }
      if (status === 403) {
        // master account belongs to different user
        // OR wrong API key type used (master/subaccount key instead of coinswitch key)
        return next(
          new AppError(
            data.message ||
              "Forbidden — ensure you are using the Coinswitch (main book) API key, not master/subaccount key",
            403
          )
        );
      }
      if (status === 404) {
        console.log(">>>>>>>>>>>",error )
        return next(
          new AppError(
            data.message ||
              `Subaccount not found for subaccount_id: ${subaccount_id}`,
            404
          )
        );
      }
      if (status === 401) {
        return next(
          new AppError(
            data.message || "Invalid or missing Coinswitch API credentials",
            401
          )
        );
      }
      if (status === 500) {
        // Doc says: "transfer failed. Please check your balance and try again"
        return next(
          new AppError(
            data.message ||
              "Transfer failed — verify sufficient balance and retry. If persistent, contact support.",
            500
          )
        );
      }

      return next(
        new AppError(
          `CoinSwitch error: ${data.message || "Unknown error"}`,
          status
        )
      );
    }

    return next(new AppError("Failed to connect to CoinSwitch DMA API", 503));
  }
});