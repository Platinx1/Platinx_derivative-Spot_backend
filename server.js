process.on("uncaughtException", (err) => {
  console.log(err, "dsljfsdlfj");
  console.log("❌ UNCAUGHT EXCEPTION:", err.name, err.message);
  process.exit(1);
});

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");
const app = require("./src/app");
const { initializeWebSocket } = require("./src/services/webSocketService");
const { connectPi42Socket } = require("./src/services/pi42SocketService");

dotenv.config({ path: "config.env" });

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
connectPi42Socket();

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


