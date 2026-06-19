const io = require("socket.io-client");
const { cancelPi42OrderFromSocket, updatePartiallyFilledPi42OrderFromSocket, updateFilledPi42OrderFromSocket, handleOrderFailed } = require("./pi42OrderService");
const { getPi42UserByAccountId } = require("./pi42UserService");
const { createPi42TradeFromSocket } = require("./pi42TradeService");
const { createPi42WalletTransactionsFromTrade } = require("./pi42WalletTransactionService");
const { updateWalletFromBalanceUpdate } = require("./pi42WalletService");
const { closePi42PositionFromSocket, updatePi42PositionFromSocket, createPi42PositionFromSocket } = require("./pi42PositionService");
require("dotenv").config();

let socket = null;

const connectPi42Socket = () => {
  try {
    if (socket && socket.connected) {
      console.log("⚠️ Socket already connected");
      return socket;
    }

    console.log("🔌 Connecting to PI42 FAWSS...");

    socket = io("https://pilot-fawss-uds.pi42.com/auth-stream", {
      // transports: ["websocket"],
      withCredentials: true,
      extraHeaders: {
        cookie: process.env.SOCKET_COOKIE,
      },
      // reconnection: true,
      // reconnectionAttempts: 10,
      // reconnectionDelay: 3000,
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
      console.log("🆕 New Order:::::::::::::::::::::::::", data);

      // TODO: save to DB
    });

    socket.on("orderFilled", async (data) => {
      console.log("✅ Order Filled:", data);

      try {
        await updateFilledPi42OrderFromSocket(data);
      } catch (error) {
        console.error("❌ Error updating filled order:", error);
      }

      // TODO: update DB
    });

    socket.on("orderPartiallyFilled", async (data) => {
      console.log("⚡ Partially Filled:", data);

      try {
        await updatePartiallyFilledPi42OrderFromSocket(data);
      } catch (error) {
        console.error("❌ Error updating partially filled order:", error);
      }
    });

    socket.on("orderCancelled", async (data) => {
      console.log("❌ Order Cancelled>>>>>>>>>>>>>>>", data);

      try {
        await cancelPi42OrderFromSocket(data);
      } catch (error) {
        console.error("❌ Error cancelling order:", error);
      }
    });

    socket.on("orderFailed", async (orderFailedData) => {
      console.log("🚨 Order Failed:", orderFailedData);

      try {
        await handleOrderFailed(orderFailedData);
      } catch (error) {
        console.error("❌ Error handling order failure:", error);
      }
      
    });

    socket.on("cancelOrderRequestFailed", async (data) => {
      console.log("❌ Cancel Order Request Failed<<<<<<<<<", data);
    });

    socket.on("editOrderUpdate", async (data) => {
      console.log("🔄 Edit Order Update:", data);
    });

    // ============================
    // 📊 POSITION EVENTS
    // ============================

    socket.on("newPosition", async (newPositionData) => {
      console.log("📈 New Position:", newPositionData);

      try {
        const user = await getPi42UserByAccountId(newPositionData.accountId);
        if (!user) {
          console.warn("⚠️ No user found for accountId:", newPositionData.accountId);
          return;
        }

        await createPi42PositionFromSocket(user._id, newPositionData);

      } catch (error) {
        console.error("❌ Error saving newPosition:", error);
      }

    });

    socket.on("updatePosition", async (updatePositionData) => {
      console.log("🔄 Position Updated:", updatePositionData);

      try {
        const user = await getPi42UserByAccountId(updatePositionData.accountId);
        if (!user) {
          console.warn("⚠️ No user found for accountId:", updatePositionData.accountId);
          return;
        }

        await updatePi42PositionFromSocket(user._id, updatePositionData);

      } catch (error) {
        console.error("❌ Error updating position:", error);
      }
    });

    socket.on("closePosition", async (closePositionData) => {
      console.log("📉 Position Closed:", closePositionData);

      try {
        const user = await getPi42UserByAccountId(closePositionData.accountId);

        if (!user) {
          console.warn("⚠️ No user found for accountId:", closePositionData.accountId);
          return;
        }

        await closePi42PositionFromSocket(user._id, closePositionData);

        console.log(`✅ Position closed successfully: ${closePositionData.positionId}`);
      } catch (error) {
        console.error("❌ Failed to close position in DB:", error);
      }

    });

    socket.on("liquidationAlert", async (liquidationAlertData) => {
      console.log("💀 Liquidation Alert:", liquidationAlertData);
    });

    // ============================
    // 💰 OTHER EVENTS
    // ============================

    socket.on("balanceUpdate", async (balanceUpdateData) => {
      console.log("💰 Balance Update:", balanceUpdateData);

      try {
        const user = await getPi42UserByAccountId(balanceUpdateData.accountId);
  
        if (!user) {
          console.warn("⚠️ No user found for accountId:", balanceUpdateData.accountId);
          return;
        }
  
        await updateWalletFromBalanceUpdate(user._id, balanceUpdateData);
      } catch (error) {
        console.error("❌ Error updating wallet from balance update:", error);
      }

    });

    socket.on("marginCallAlert", (data) => {
      console.log("⚠️ Margin Call:", data);
    });

    socket.on("newTrade", async (tradeData) => {
      console.log("💱 Trade Executed:", tradeData);

      try {
        const user = await getPi42UserByAccountId(tradeData.accountId);
  
        if (!user) {
          console.warn("⚠️ No user found for accountId:", tradeData.accountId);
          return;
        }
  
        await Promise.all([
          createPi42TradeFromSocket(user._id, tradeData),
          createPi42WalletTransactionsFromTrade(user._id, tradeData),
        ]);
      } catch (error) {
        console.error("❌ Error processing new trade:", error);
      }
    });

    // return socket;

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