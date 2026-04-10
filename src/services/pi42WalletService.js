// services/pi42WalletService.js
const Pi42Wallet = require("../models/pi42Models/pi42Wallet");
const { toDecimal128 } = require("../models/pi42Models/decimal");

/**
 * Creates or Updates the Pi42 Futures Wallet for a user
 * @param {String} userId 
 * @param {String|ObjectId} pi42AccountId 
 * @param {Object} pi42WalletData - Raw response from /futures-wallet/details API
 * @returns {Promise<Object>} Saved/Updated wallet document
 */

exports.upsertFuturesWallet = async (pi42AccountId, pi42WalletData) => {
  if (!pi42WalletData || !pi42WalletData.marginAsset) {
    throw new Error("Invalid wallet data from Pi42");
  }

  const walletData = {
    pi42Account: pi42AccountId,

    marginAsset: pi42WalletData.marginAsset.toUpperCase(),

    // Core balances
    walletBalance: toDecimal128(pi42WalletData.walletBalance || pi42WalletData.inrBalance),
    withdrawableBalance: toDecimal128(pi42WalletData.withdrawableBalance),
    maxWithdrawableBalance: toDecimal128(pi42WalletData.maxWithdrawableBalance),
    lockedBalance: toDecimal128(pi42WalletData.lockedBalance),
    marginBalance: toDecimal128(pi42WalletData.marginBalance),

    // Extra fields
    lastUpdatedAt: new Date(),

    isActive: true,
    isDeleted: false,
  };

  // Upsert Logic
  const updatedWallet = await Pi42Wallet.findOneAndUpdate(
    {
      pi42Account: pi42AccountId,
      marginAsset: pi42WalletData.marginAsset.toUpperCase()
    },
    walletData,
    {
      upsert: true,      // Create if not exists, update if exists
      new: true,         // Return the updated document
      runValidators: true
    }
  );

  return updatedWallet;
};


exports.updateWalletFromBalanceUpdate = async (pi42AccountId, balanceUpdateData) => {
  if (!balanceUpdateData || !balanceUpdateData.asset) {
    throw new Error("Invalid balanceUpdate data: asset is required");
  }

  const walletData = {
    pi42Account: pi42AccountId,
    marginAsset: balanceUpdateData.asset.toUpperCase(),

    // Mapping from balanceUpdate event
    walletBalance: toDecimal128(balanceUpdateData.updatedWalletBalance),
    lockedBalance: toDecimal128(balanceUpdateData.updatedLockedBalance),

    // Note: In balanceUpdate, we usually get "availableBalance"
    // withdrawableBalance and marginBalance are often the same as availableBalance
    withdrawableBalance: toDecimal128(balanceUpdateData.updatedAvailableBalance),
    maxWithdrawableBalance: toDecimal128(balanceUpdateData.updatedAvailableBalance),
    marginBalance: toDecimal128(balanceUpdateData.updatedAvailableBalance),

    lastUpdatedAt: new Date(),
    isActive: true,
    isDeleted: false,
  };

  // Update existing wallet (do NOT upsert here, because we expect wallet to already exist)
  const updatedWallet = await Pi42Wallet.findOneAndUpdate(
    {
      pi42Account: pi42AccountId,
      marginAsset: balanceUpdateData.asset.toUpperCase(),
    },
    walletData,
    {
      new: true,                    // Return updated document
      runValidators: true,
    }
  );

  return updatedWallet;
};