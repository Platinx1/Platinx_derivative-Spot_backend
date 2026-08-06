process.on("uncaughtException", (err) => {
  console.log(err, "dsljfsdlfj");
  console.log("❌ UNCAUGHT EXCEPTION:", err.name, err.message);
  process.exit(1);
});

const ApiTradingClient = require("./apiTradingClient");

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");
const app = require("./src/app");
const { initializeWebSocket } = require("./src/services/webSocketService");
const { connectPi42Socket } = require("./src/services/pi42SocketService");
require("./src/services/coinswitchSocketService");

dotenv.config({ path: "config.env" });

const apiKey = process.env.API_KEY;
const secretKey = process.env.API_SECRET;

// MongoDB Connection
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.log("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const Port = process.env.PORT || 9000;

const server = http.createServer(app);

// Initialize WebSocket server
initializeWebSocket(server);
connectPi42Socket(); // Connect Pi42 Socket

// Start server
server.listen(Port, () => {
  console.log(`🚀 Server running on port: ${Port}`);
  console.log(`📡 WebSocket available at ws://localhost:${Port}`);
});



// const collection = mongoose.connection.collection("pi42trades");

// collection.dropIndex("tradeId_1")
//   .then(() => {
//     console.log("✅ Dropped index: tradeId_1");
//   })
//   .catch(() => {
//     console.log("⚠️ tradeId_1 index not found or already dropped");
//   });

// // Drop compound unique index
// collection.dropIndex("pi42Account_1_tradeId_1")
//   .then(() => {
//     console.log("✅ Dropped index: pi42Account_1_tradeId_1");
//   })
//   .catch(() => {
//     console.log("⚠️ pi42Account_1_tradeId_1 index not found or already dropped");
//   });

// Temporary code - Sirf ek baar run karo
// collection.dropIndex({ pi42Account: 1, tradeId: 1 })
//   .then(() => console.log("Old index dropped"))
//   .catch(err => console.log("No old index or already dropped:", err.message));

// collection.createIndex(
//   { "pi42Account": 1, "tradeId": 1 },
//   { unique: true }
// )



// const coinswitchPortfolioCollection =
//   mongoose.connection.collection("coinswitchportfolios");

// coinswitchPortfolioCollection
//   .dropIndex("pair_1")
//   .then(() => {
//     console.log("✅ Dropped index: pair_1");
//   })
//   .catch(() => {
//     console.log("⚠️ pair_1 index not found or already dropped");
//   });

// coinswitchPortfolioCollection
//   .dropIndex("coinswitchAccount_1_pair_1")
//   .then(() => {
//     console.log("✅ Dropped index: coinswitchAccount_1_pair_1");
//   })
//   .catch(() => {
//     console.log(
//       "⚠️ coinswitchAccount_1_pair_1 index not found or already dropped"
//     );
//   });

// coinswitchPortfolioCollection
//   .dropIndex("coinswitchAccount_1_asset_1")
//   .then(() => {
//     console.log("✅ Dropped index: coinswitchAccount_1_asset_1");
//   })
//   .catch(() => {
//     console.log(
//       "⚠️ coinswitchAccount_1_asset_1 index not found or already dropped"
//     );
//   });


// const coinswitchWalletCollection =
//   mongoose.connection.collection("coinswitchwallets");

// coinswitchWalletCollection
//   .dropIndex("coinswitchAccount_1_asset_1")
//   .then(() => {
//     console.log("✅ Dropped index: coinswitchAccount_1_asset_1");
//   })
//   .catch(() => {
//     console.log(
//       "⚠️ coinswitchAccount_1_asset_1 index not found or already dropped"
//     );
//   });


process.on("unhandledRejection", (err) => {
  console.log("❌ UNHANDLED REJECTION:", err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⏹️  Shutting down gracefully...");

  server.close(() => {
    console.log("✅ Server closed");
    mongoose.connection.close(() => {
      console.log("✅ MongoDB connection closed");
      process.exit(0);
    });
  });
});

const client = new ApiTradingClient(secretKey, apiKey);

// (async () => {

//     const payload = {
//         side: "sell",
//         symbol: "usds/usdt",
//         type: "limit",
//         price: 0.998,
//         quantity: 16,
//         exchange: "C2C1"
//     };

//     // console.log(">>>>>>>>>>>>>>>>>...............", apiKey, secretKey);

//     const result = await client.createOrder(payload);

//     console.log("====>>>>>>>>======", result);

// })();


