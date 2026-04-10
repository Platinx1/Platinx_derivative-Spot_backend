const Pi42Account = require("../models/pi42Models/pi42Account");
const { toDecimal128 } = require("../models/pi42Models/decimal");

exports.createPi42User = async (randomUserId, pi42UserId, pi42AccountId, refId) => {
  const newUser = new Pi42Account({
    user: randomUserId,
    pi42UserId,
    pi42AccountId,
    refId,
  });
  return await newUser.save();
};

exports.getPi42User = async (userId, accountId) => {
  return await Pi42Account.findOne({ pi42UserId: userId, pi42AccountId: accountId, isDeleted: false }).exec();
};

exports.getPi42UserByAccountId = async (accountId) => {
  return await Pi42Account.findOne({ pi42AccountId: accountId, isDeleted: false }).exec();
};

