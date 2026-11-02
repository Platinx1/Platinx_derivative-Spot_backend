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
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return JSON.stringify(sorted); // compact by default in modern Node
  // If still has spaces → .replace(/\s+/g, '') but usually not needed
}

function generateSignature(message, secretHex) {
  const secretKey = Uint8Array.from(Buffer.from(secretHex, "hex"));
  const msgBytes = new TextEncoder().encode(message);
  const sigBytes = ed25519.sign(msgBytes, secretKey);
  return Buffer.from(sigBytes).toString("hex");
}

// function getAuthHeaders(
//   method,
//   path,
//   queryParams = {},
//   body = null,
//   apiKey = process.env.API_KEY,
//   apiSecret = process.env.API_SECRET,
// ) {
//   if (!apiKey || !apiSecret) {
//     throw new Error("API_KEY or API_SECRET not set in env");
//   }

//   console.log("Generating auth headers for:", method, path);
//   console.log("Query params:", queryParams);
//   console.log("Body:", body);

//   const epoch = Date.now().toString();

//   const queryString = new URLSearchParams(queryParams).toString();
//   let signingPath = path;
//   if (queryString) {
//     signingPath += "?" + queryString;
//     signingPath = decodeURIComponent(signingPath); // only if query exists
//   }

//   let message = method.toUpperCase() + signingPath + epoch;

//   const isFuturesDMA = path.startsWith("/v5/") || path.startsWith("/dma/");
//   if (
//     body &&
//     isFuturesDMA &&
//     ["POST", "PUT", "DELETE"].includes(method.toUpperCase())
//   ) {
//     const bodyStr = canonicalJson(body);
//     message += bodyStr;
//   }

//   console.log("Signature Message:", message);
//   console.log("Signing path:", signingPath);

//   const signature = generateSignature(message, apiSecret);

//   return {
//     "Content-Type": "application/json",
//     "X-AUTH-APIKEY": apiKey,
//     "X-AUTH-SIGNATURE": signature,
//     "X-AUTH-EPOCH": epoch,
//   };
// }

// utils/signatureHelper.js
function getAuthHeaders(
  method,
  path,
  queryParams = {},
  body = null,
  apiKey = process.env.API_KEY,
  apiSecret = process.env.API_SECRET,
  epochUnit = "ms"
) {
  if (!apiKey || !apiSecret) {
    throw new Error("API_KEY or API_SECRET not set in env");
  }

  // console.log("Generating auth headers for:", method, path);
  // console.log("Query params:", queryParams);
  // console.log("Body:", body);

  // const epoch = Date.now().toString();
  const epoch =
    epochUnit === "s"
      ? Math.floor(Date.now() / 1000).toString() // seconds for DMA B2B API
      : Date.now().toString();  

  const queryString = new URLSearchParams(queryParams).toString();
  let signingPath = path;
  if (queryString) {
    signingPath += "?" + queryString;
    signingPath = decodeURIComponent(signingPath); // only if query exists
  }

  let message = method.toUpperCase() + signingPath + epoch;

  // Only append body for /v5/ POSTs (futures trading), skip for /dma/ and spot
  const isFuturesTrading = path.startsWith("/v5/") && !path.includes('market/'); // e.g. append for /v5/order/create, skip market GET/POST
  if (
    body &&
    isFuturesTrading &&
    ["POST", "PUT", "DELETE"].includes(method.toUpperCase())
  ) {
    const bodyStr = canonicalJson(body);
    message += bodyStr;
  }

  // console.log("Signature Message:::::::::", message);
  // console.log("Signing path:", signingPath);

  const signature = generateSignature(message, apiSecret);

  return {
    "Content-Type": "application/json",
    "X-AUTH-APIKEY": apiKey,
    "X-AUTH-SIGNATURE": signature,
    "X-AUTH-EPOCH": epoch,
  };
}

module.exports = { getAuthHeaders, generateSignature };
