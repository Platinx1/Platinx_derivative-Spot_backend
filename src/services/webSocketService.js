const WebSocket = require("ws");

let wss;
const clients = new Set();

function initializeWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", async (ws) => {
    console.log("👤 Client connected");
    clients.add(ws);

    try {
      // const stats = await get24hStats();
      // if (stats) {
      //   ws.send(JSON.stringify({ type: "stats", data: stats }));
      // }
    } catch (error) {
      console.error("Error sending stats:", error.message);
    }

    ws.on("close", () => {
      console.log("👤 Client disconnected");
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("WS error:", error.message);
      clients.delete(ws);
    });
  });

  console.log("📡 WebSocket initialized");
}

function broadcastToClients(message) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (error) {
        console.error("Broadcast error:", error.message);
      }
    }
  });
}

function getConnectedClients() {
  return clients.size;
}

module.exports = {
  initializeWebSocket,
  broadcastToClients,
  getConnectedClients,
};