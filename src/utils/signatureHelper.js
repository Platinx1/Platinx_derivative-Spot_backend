const crypto = require("crypto");

function generateSignature(method, path, timestamp, body = "", apiSecret) {
  // Create message string: METHOD + PATH + TIMESTAMP + BODY
  // PATH must include query params for GET requests
  const message = method + path + timestamp + body;

  return crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
}

function getAuthHeaders(method, path, body = "", apiKey, apiSecret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateSignature(method, path, timestamp, body, apiSecret);

  return {
    "Content-Type": "application/json",
    "X-AUTH-APIKEY": apiKey,
    "X-AUTH-SIGNATURE": signature,
    "X-AUTH-TIMESTAMP": timestamp,
  };
}

module.exports = {
  generateSignature,
  getAuthHeaders,
};
