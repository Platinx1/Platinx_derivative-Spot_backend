



const ed25519 = require("@noble/ed25519");
const { sha512 } = require("@noble/hashes/sha2.js"); // Required for ed25519 in recent versions
const { TextEncoder } = require("util");


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
  path,                // e.g. "/trade/api/v2/24hr/ticker"
  queryParams = {},
  body = null,
  apiKey = process.env.API_KEY,
  apiSecret = process.env.API_SECRET
) {
  if (!apiKey || !apiSecret) {
    throw new Error("API_KEY or API_SECRET not set in env");
  }

  console.log("Generating auth headers for:", method, path);
  console.log("Query params:", queryParams);
  console.log("Body:", body);

  const epoch = Date.now().toString();  // ms string

  // Build the query string encoded (for the actual URL)
  const queryString = new URLSearchParams(queryParams).toString();

  // Full path for URL (encoded)
  let fullPathForUrl = path;
  if (queryString) fullPathForUrl += "?" + queryString;

  // For signing: DECODE / UNQUOTE the full path+query
  let signingPath = fullPathForUrl;
  if (queryString) {
    // Decode once → BTC/INR instead of BTC%2FINR
    signingPath = decodeURIComponent(fullPathForUrl);
  }

  // Message order: METHOD + decoded_path?query + epoch  (NO spaces, NO + body for GET)
  let message = method.toUpperCase() + signingPath + epoch;

  if (body && ["POST", "PUT", "DELETE"].includes(method.toUpperCase())) {
    const bodyStr = canonicalJson(body);  // your existing sorted compact JSON
    message += bodyStr;
  }

  console.log("Signature Message:", message);          // ← log this!
  console.log("Signing path (decoded):", signingPath); // helpful debug

  const signature = generateSignature(message, apiSecret);

  return {
    "Content-Type": "application/json",
    "X-AUTH-APIKEY": apiKey,
    "X-AUTH-SIGNATURE": signature,
    "X-AUTH-EPOCH": epoch,
  };
}

// function getAuthHeaders(
//   method,
//   path,                // raw path like "/v5/market/time"
//   queryParams = {},
//   body = null,
//   apiKey = process.env.API_KEY,
//   apiSecret = process.env.API_SECRET
// ) {
//   if (!apiKey || !apiSecret) {
//     throw new Error("API_KEY or API_SECRET not set in env");
//   }

//   console.log("Generating auth headers for:", method, path);
//   console.log("Query params:", queryParams);
//   console.log("Body:", body);

//   const epoch = Math.floor(Date.now()).toString();  // Better: use seconds or ms consistently (doc uses ms)

//   // Build query string (encoded)
//   const queryString = new URLSearchParams(queryParams).toString();

//   // Full path for URL (with encoded query)
//   let signingPath = path;
//   if (queryString) {
//     signingPath += "?" + queryString;
//   }

//   // IMPORTANT: Do NOT decode here for signing!
//   // Only decode if you need to normalize for display/logging
//   // CoinSwitch/Bybit signs the **encoded** version as sent in URL

//   let message = method.toUpperCase() + signingPath + epoch;

//   if (body && ["POST", "PUT", "DELETE", "PATCH"].includes(method.toUpperCase())) {
//     const bodyStr = canonicalJson(body);
//     message += bodyStr;
//   }

//   console.log("Signature Message:", message);
//   console.log("Signing path (as used):", signingPath);

//   const signature = generateSignature(message, apiSecret);

//   return {
//     "Content-Type": "application/json",
//     "X-AUTH-APIKEY": apiKey,
//     "X-AUTH-SIGNATURE": signature,
//     "X-AUTH-EPOCH": epoch,
//   };
// }

module.exports = { getAuthHeaders, generateSignature };