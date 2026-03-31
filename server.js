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


