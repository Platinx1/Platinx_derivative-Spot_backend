// // utils/signatureHelper.js
const ed25519 = require("@noble/ed25519");
const { sha512 } = require("@noble/hashes/sha2.js"); // Required for ed25519 in recent versions
const { TextEncoder } = require("util");

// // Required setup for @noble/ed25519 (do this once at module load)
// ed25519.hashes.sha512 = sha512;


// function generateSignature(method, fullPathWithQuery, epochMs, apiSecretHex) {
//   const secretKey = Uint8Array.from(Buffer.from(apiSecretHex, "hex"));

//   // Message = METHOD + unquoted path+query + epoch_ms (no body for GET)
//   const message = method + fullPathWithQuery + epochMs;
//   const messageBytes = new TextEncoder().encode(message);

//   const signatureBytes = ed25519.sign(messageBytes, secretKey);
//   return Buffer.from(signatureBytes).toString("hex");
// }


// function getAuthHeaders(method, path, queryParams = {}, apiKey=process.env.API_KEY, apiSecretHex=process.env.API_SECRET) {

//   const epochMs = Date.now().toString();

 
//   let endpointWithQuery = path;
//   if (Object.keys(queryParams).length > 0) {
//     const queryString = new URLSearchParams(queryParams).toString();
//     endpointWithQuery += (path.includes("?") ? "&" : "?") + queryString;
//   }


//   const unquotedFullPath = decodeURIComponent(endpointWithQuery);

 
//   const signature = generateSignature(method, unquotedFullPath, epochMs, apiSecretHex);

//   return {
//     "Content-Type": "application/json",
//     "X-AUTH-APIKEY": apiKey,
//     "X-AUTH-SIGNATURE": signature,
//     "X-AUTH-EPOCH": epochMs, 
//   };
// }

// module.exports = {
//   generateSignature,
//   getAuthHeaders,
// };





// Setup noble ed25519
ed25519.hashes.sha512 = sha512;

function canonicalJson(obj) {
  // Sort keys alphabetically + produce compact JSON (no spaces)
  const sorted = Object.create(null);
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sorted[key] = obj[key];
    });
  return JSON.stringify(sorted);  // compact by default in modern Node
  // If still has spaces → .replace(/\s+/g, '') but usually not needed
}

function generateSignature(message, secretHex) {
  const secretKey = Uint8Array.from(Buffer.from(secretHex, "hex"));
  const msgBytes = new TextEncoder().encode(message);
  const sigBytes = ed25519.sign(msgBytes, secretKey);
  return Buffer.from(sigBytes).toString("hex");
}

function getAuthHeaders(
  method,
  path,                // raw path like "/trade/api/v2/futures/leverage"
  queryParams = {},
  body = null,         // ← now properly used for POST body
  apiKey = process.env.API_KEY,
  apiSecret = process.env.API_SECRET
) {
  if (!apiKey || !apiSecret) {
    throw new Error("API_KEY or API_SECRET not set in env");
  }

  const epoch = Date.now().toString();  // ms string

  let signingPath = path;
  if (Object.keys(queryParams).length > 0) {
    const qs = new URLSearchParams(queryParams).toString();
    signingPath += "?" + qs;
  }

  const cleanPath = decodeURIComponent(signingPath);

  let message = method.toUpperCase() + cleanPath + epoch;

  // Append body for POST/PUT/DELETE if present
  if (body && ["POST", "PUT", "DELETE"].includes(method.toUpperCase())) {
    const bodyStr = canonicalJson(body);
    message += bodyStr;
  }

  const signature = generateSignature(message, apiSecret);

  return {
    "Content-Type": "application/json",
    "X-AUTH-APIKEY": apiKey,
    "X-AUTH-SIGNATURE": signature,
    "X-AUTH-EPOCH": epoch,
  };
}

module.exports = { getAuthHeaders, generateSignature };