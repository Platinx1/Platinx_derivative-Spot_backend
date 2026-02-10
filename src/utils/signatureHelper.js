// utils/signatureHelper.js
const ed25519 = require("@noble/ed25519");
const { sha512 } = require("@noble/hashes/sha2.js"); // Required for ed25519 in recent versions
const { TextEncoder } = require("util");

// Required setup for @noble/ed25519 (do this once at module load)
ed25519.hashes.sha512 = sha512;


function generateSignature(method, fullPathWithQuery, epochMs, apiSecretHex) {
  const secretKey = Uint8Array.from(Buffer.from(apiSecretHex, "hex"));

  // Message = METHOD + unquoted path+query + epoch_ms (no body for GET)
  const message = method + fullPathWithQuery + epochMs;
  const messageBytes = new TextEncoder().encode(message);

  const signatureBytes = ed25519.sign(messageBytes, secretKey);
  return Buffer.from(signatureBytes).toString("hex");
}


function getAuthHeaders(method, path, queryParams = {}, apiKey=process.env.API_KEY, apiSecretHex=process.env.API_SECRET) {

  const epochMs = Date.now().toString();

 
  let endpointWithQuery = path;
  if (Object.keys(queryParams).length > 0) {
    const queryString = new URLSearchParams(queryParams).toString();
    endpointWithQuery += (path.includes("?") ? "&" : "?") + queryString;
  }


  const unquotedFullPath = decodeURIComponent(endpointWithQuery);

 
  const signature = generateSignature(method, unquotedFullPath, epochMs, apiSecretHex);

  return {
    "Content-Type": "application/json",
    "X-AUTH-APIKEY": apiKey,
    "X-AUTH-SIGNATURE": signature,
    "X-AUTH-EPOCH": epochMs, 
  };
}

module.exports = {
  generateSignature,
  getAuthHeaders,
};