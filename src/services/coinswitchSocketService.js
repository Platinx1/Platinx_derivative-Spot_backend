// const { io } = require("socket.io-client");

// const sock = io("wss://ws.coinswitch.co/coinswitchx", {
//   path: "/pro/realtime-rates-socket/spot",
//   transports: ["websocket"],
// });

// sock.on("connect", () => {
//   console.log("✅ CoinSwitch socket Connected");

//   sock.emit("FETCH_ORDER_BOOK_CS_PRO", {
//     event: "subscribe",
//     pair: "BTC,INR",
//   });
// });

// sock.on("FETCH_ORDER_BOOK_CS_PRO", (data) => {
//   console.log("update:", data);
// });

// sock.on("disconnect", (reason) => {
//   console.log("Disconnected:", reason);
// });

// sock.on("connect_error", (err) => {
//   console.log("Connection Error:", err);
// });

// module.exports = sock;




const { io } = require('socket.io-client');
const { updateCoinswitchOrder } = require('./coinswitchOrderService');

const sock = io('wss://ws.coinswitch.co/orderupdates', {
  path: '/pro/realtime-rates-socket/spot/order-updates',
  transports: ['websocket'],
});

sock.on('connect', () => {
  // console.log("=========", process.env.API_KEY);
  sock.emit('FETCH_ORDER_UPDATES', {
    apikey: process.env.API_KEY,
    event:  'subscribe',
  });
});

sock.on('FETCH_ORDER_UPDATES', async (data) => {
  console.log('update:', data);
  if(data && data.i) {
    await updateCoinswitchOrder(data);
  }
});

module.exports = sock;