const generateSignature = require("./generateSignature")

function buildHeaders(partnerName, cookie, userId, accountId) {

  const data = {
    timestamp: Date.now().toString(),
    "partner-name": partnerName 
  };

  if (userId) data["user-id"] = userId;
  if (accountId) data["account-id"] = accountId;

  const signature = generateSignature(data);

  const headers = {
    ...data,
    "header-sig": signature,  // 👈 yahi signature hai
    Cookie: cookie
  };

  return headers;
}

module.exports = buildHeaders;