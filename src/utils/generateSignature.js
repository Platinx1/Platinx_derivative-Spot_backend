const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// const privateKey = fs.readFileSync("keys/private.pem", "utf8");

const privateKey = fs.readFileSync(
  path.join(__dirname, "../keys/private.pem"),
  "utf8"
);

function generateSignature(data) {
  const signer = crypto.createSign("RSA-SHA256");

  signer.update(JSON.stringify(data));
  signer.end();

  const signature = signer.sign(privateKey, "hex");

  return signature;
}

module.exports = generateSignature;