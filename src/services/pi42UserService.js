const Pi42Account = require("../models/pi42Models/pi42Account");
const AppError = require("../utils/AppError");

exports.createPi42User = async (platinxUserId, pi42UserId, pi42AccountId, refId) => {
  const newUser = new Pi42Account({
    user: platinxUserId,
    pi42UserId,
    pi42AccountId,
    refId,
  });
  return await newUser.save();
};

exports.updatePi42User = async (platinxUserId, pi42UserId, pi42AccountId, refId) => {
  const updated = await Pi42Account.findOneAndUpdate(
    { user: platinxUserId, isDeleted: false },
    {
      $set: {
        refId,
        pi42UserId,
        pi42AccountId,
        isActive: true,
      },
    },
    {
      new: true,  
      runValidators: false,
    }
  );

  if (!updated) {
    throw new AppError("Failed to update Pi42 account details", 500);
  }

  return updated;
};

exports.getPi42User = async (userId, accountId) => {
  return await Pi42Account.findOne({ pi42UserId: userId, pi42AccountId: accountId, isDeleted: false }).exec();
};

exports.getPi42UserByAccountId = async (accountId) => {
  return await Pi42Account.findOne({ pi42AccountId: accountId, isDeleted: false }).exec();
};

exports.getPi42UserByPlatinxUserId = async (userId) => {
  return await Pi42Account.findOne({ user: userId, isDeleted: false }).exec();
};
