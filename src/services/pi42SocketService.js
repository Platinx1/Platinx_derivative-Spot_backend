const io = require("socket.io-client");
require("dotenv").config();

let socket = null;

const connectPi42Socket = () => {
  try {
    if (socket && socket.connected) {
      console.log("⚠️ Socket already connected");
      return socket;
    }

    console.log("🔌 Connecting to PI42 FAWSS...");
    // console.log("token==============................", process.env.SOCKET_COOKIE);

    socket = io("https://pilot-fawss-uds.pi42.com/auth-stream", {
      transports: ["websocket"],
      withCredentials: true,
      extraHeaders: {
        cookie: process.env.SOCKET_COOKIE,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    // ✅ CONNECTION SUCCESS
    socket.on("connect", () => {
      console.log("✅ PI42 Socket Connected");
      console.log("🆔 Socket ID:", socket.id);
    });

    // ❌ CONNECTION ERROR
    socket.on("connect_error", (err) => {
      console.error("🚨 Socket Connection Error:", err.message);
    });

    // ❌ DISCONNECT
    socket.on("disconnect", (reason) => {
      console.log("❌ Socket Disconnected:", reason);
    });

    // 🔥 DEBUG ALL EVENTS (VERY IMPORTANT)
    socket.onAny((event, data) => {
      console.log("🔥 EVENT:", event);
    });

    // ============================
    // 🎯 ORDER EVENTS
    // ============================

    socket.on("newOrder", async (data) => {
      console.log("🆕 New Order:", data.clientOrderId);
      console.log("::::::::::::::::::::::::", data);

      // TODO: save to DB
    });

    socket.on("orderFilled", async (data) => {
      console.log("✅ Order Filled:", data.clientOrderId);

      // TODO: update DB
    });

    socket.on("orderPartiallyFilled", async (data) => {
      console.log("⚡ Partial Fill:", data.clientOrderId);
    });

    socket.on("orderCancelled", async (data) => {
      console.log("❌ Order Cancelled:", data.clientOrderId);
    });

    socket.on("orderFailed", async (data) => {
      console.log("🚨 Order Failed:", data.clientOrderId);
    });

    // ============================
    // 📊 POSITION EVENTS
    // ============================

    socket.on("newPosition", async (data) => {
      console.log("📈 New Position:", data.positionId);
    });

    socket.on("updatePosition", async (data) => {
      console.log("🔄 Position Updated:", data.positionId);
    });

    socket.on("closePosition", async (data) => {
      console.log("📉 Position Closed:", data.positionId);
    });

    socket.on("liquidationAlert", async (data) => {
      console.log("💀 Liquidation Alert:", data.positionId);
    });

    // ============================
    // 💰 OTHER EVENTS
    // ============================

    socket.on("marginCallAlert", (data) => {
      console.log("⚠️ Margin Call:", data);
    });

    socket.on("newTrade", (data) => {
      console.log("💱 Trade Executed:", data);
    });

    return socket;

  } catch (error) {
    console.error("❌ Socket Init Error:", error);
  }
};

// 🛑 DISCONNECT FUNCTION
const disconnectPi42Socket = () => {
  if (socket) {
    socket.disconnect();
    console.log("🛑 Socket manually disconnected");
  }
};

module.exports = {
  connectPi42Socket,
  disconnectPi42Socket,
};