const axios = require("axios");
const cron = require("node-cron");
const CoinswitchOrder = require("../models/coinswitchModels/coinswitchOrder");
const SyncState = require("../models/coinswitchModels/coinswitchSyncState");
const { buildUrlAndParams } = require("../utils/urlAndParamsHelper");
const { getAuthHeaders } = require('../utils/signatureHelper');

const ENDPOINTS = {
  ORDER: '/trade/api/v2/order',
  ORDERS_LIST: '/trade/api/v2/orders'
};

// ---------------- CONFIG ----------------
const CRON_EXPRESSION = "*/5 * * * * *";     // har 5 sec (6 fields = seconds support)
const BUFFER_MS = 10000;                     // cursor se itna peeche se fetch (clock skew / lag)
const FUTURE_SKEW_MS = 2000;                 // to_time me thoda extra
const INITIAL_LOOKBACK_MS = 60000;           // pehli baar cursor nahi mila to
const MAX_CATCHUP_MS = 24 * 60 * 60 * 1000;  // lamba downtime ho to max itna peeche tak
const SLICE_MS = 5 * 60 * 1000;              // catch-up me window ko itne ke slices me todo
const OPEN_COUNT = 100;
const CLOSED_COUNT = 500;
const MIN_SPLIT_MS = 1000;                   // isse chhoti window split nahi hogi
const UNMATCHED_GRACE_MS = 2 * 60 * 1000;    // DB me order late save hone ka wait
const CURSOR_KEY = "coinswitch_order_sync_cursor";

const VALID_STATUSES = new Set([
  "RAISED", "OPEN", "EXECUTED", "PARTIALLY_EXECUTED", "CANCELLED",
  "DISCARDED", "EXPIRED", "CANCELLATION_RAISED", "EXPIRATION_RAISED",
]);

let isRunning = false; // overlap guard
let task = null;

// ---------------- HELPERS ----------------
// 1e-7 jaisi exponent notation se bachne ke liye
function toPlainString(n) {
  const s = String(n);
  if (!/e/i.test(s)) return s;
  return Number(n).toFixed(18).replace(/\.?0+$/, "");
}

async function getCursor() {
  const doc = await SyncState.findOne({ key: CURSOR_KEY }).lean();
  return doc ? doc.value : null;
}

async function saveCursor(value) {
  await SyncState.updateOne(
    { key: CURSOR_KEY },
    { $set: { value } },
    { upsert: true }
  );
}

async function callOrdersApi(fromTime, toTime, open, count) {
  const method = "GET";
  const path = ENDPOINTS.ORDERS_LIST;
  const queryObj = { open, from_time: fromTime, to_time: toTime, count };

  const { fullUrl } = buildUrlAndParams(path, queryObj);
  const headers = getAuthHeaders(method, path, queryObj, null);

  const response = await axios({ method, url: fullUrl, headers });
  return response?.data?.data?.orders || [];
}

// Result count ke barabar aaye to truncate ho sakta hai -> window aadhi karke dobara fetch
async function fetchWindow(fromTime, toTime, open, count, collected) {
  const orders = await callOrdersApi(fromTime, toTime, open, count);

  if (orders.length >= count && toTime - fromTime > MIN_SPLIT_MS) {
    const mid = Math.floor((fromTime + toTime) / 2);
    await fetchWindow(fromTime, mid, open, count, collected);
    await fetchWindow(mid, toTime, open, count, collected); // boundary inclusive, dedupe Map se hoga
    return;
  }

  if (orders.length >= count) {
    console.warn(
      `[CoinSwitch Sync] WARNING: ${orders.length} orders in ${toTime - fromTime}ms window, truncation possible`
    );
  }

  for (const o of orders) collected.set(o.order_id, o);
}

async function fetchAllOrders(fromTime, toTime) {
  const collected = new Map();
  await fetchWindow(fromTime, toTime, true, OPEN_COUNT, collected);    // open orders
  await fetchWindow(fromTime, toTime, false, CLOSED_COUNT, collected); // closed (executed/cancelled)
  return [...collected.values()];
}

// Ek window sync karo
async function syncWindow(fromTime, toTime) {
  const orders = await fetchAllOrders(fromTime, toTime);
  if (!orders.length) return { fetched: 0, updated: 0, unmatchedMin: null };

  const orderIds = orders.map((o) => o.order_id);

  const existingDocs = await CoinswitchOrder.find({ orderId: { $in: orderIds } })
    .select("orderId status price")
    .lean();
  const existingMap = new Map(existingDocs.map((d) => [d.orderId, d]));

  const bulkOps = [];
  let unmatchedMin = null;
  const now = Date.now();

  for (const order of orders) {
    const existing = existingMap.get(order.order_id);

    if (!existing) {
      // DB me abhi nahi hai: agar order naya hai to cursor aage nahi badhega (retry hoga)
      const created = Number(order.created_time);
      if (created && now - created < UNMATCHED_GRACE_MS) {
        unmatchedMin = unmatchedMin === null ? created : Math.min(unmatchedMin, created);
      }
      continue;
    }

    const newStatus = order.status;
    if (!VALID_STATUSES.has(newStatus)) {
      console.warn(`[CoinSwitch Sync] Unknown status "${newStatus}" for ${order.order_id}, skipped`);
      continue;
    }

    const newSymbol = order.symbol ? String(order.symbol).trim().toUpperCase() : null;

    const statusChanged = newStatus !== existing.status;
    const priceChanged =
      order.price != null &&
      (existing.price == null || Number(order.price) !== Number(existing.price));
      const symbolChanged = newSymbol !== null && newSymbol !== existing.symbol;

    if (!statusChanged && !priceChanged && !symbolChanged) continue; 

    const set = {};
    if (statusChanged) set.status = newStatus;
    if (priceChanged) set.price = toPlainString(order.price);
    if (symbolChanged) set.symbol = newSymbol;

    bulkOps.push({
      updateOne: {
        filter: { orderId: order.order_id },
        update: { $set: set },
      },
    });
  }

  if (bulkOps.length) {
    await CoinswitchOrder.bulkWrite(bulkOps, { ordered: false });
  }

  return { fetched: orders.length, updated: bulkOps.length, unmatchedMin };
}

// ---------------- MAIN CYCLE ----------------
async function runSyncCycle() {
  if (isRunning) return; // pichhla run chal raha hai, ye tick skip
  isRunning = true;

  try {
    const cycleEnd = Date.now();

    let cursor = await getCursor();
    if (cursor === null) cursor = cycleEnd - INITIAL_LOOKBACK_MS;
    cursor = Math.max(cursor, cycleEnd - MAX_CATCHUP_MS);

    let pos = cursor - BUFFER_MS; // buffer ke saath peeche se shuru
    const end = cycleEnd;

    let totalFetched = 0;
    let totalUpdated = 0;
    let holdBack = null;      // unmatched orders ki wajah se cursor yahan tak hi badhega
    let completedTo = cursor; // kahan tak successfully sync ho chuka

    try {
      while (pos < end) {
        const sliceTo = Math.min(pos + SLICE_MS, end);
        const toWithSkew = sliceTo === end ? sliceTo + FUTURE_SKEW_MS : sliceTo;

        const { fetched, updated, unmatchedMin } = await syncWindow(pos, toWithSkew);
        totalFetched += fetched;
        totalUpdated += updated;

        if (unmatchedMin !== null) {
          holdBack = holdBack === null ? unmatchedMin : Math.min(holdBack, unmatchedMin);
        }

        completedTo = sliceTo;
        pos = sliceTo;
      }
    } finally {
      // Success ya partial failure, dono me jahan tak pahunche wahan tak cursor save karo
      let newCursor = completedTo;
      if (holdBack !== null) newCursor = Math.min(newCursor, holdBack);
      if (newCursor > cursor) await saveCursor(newCursor); // cursor kabhi peeche nahi jayega
    }

    if (totalFetched || totalUpdated) {
      console.log(`[CoinSwitch Sync] fetched=${totalFetched}, updated=${totalUpdated}`);
    }
  } catch (error) {
    const msg = error.response
      ? `${error.response.status} - ${error.response.data?.message || "API error"}`
      : error.message;
    console.error("[CoinSwitch Sync] Error:", msg);
  } finally {
    isRunning = false;
  }
}

// ---------------- CRON START / STOP ----------------
function startCoinswitchOrderSync() {
  if (task) return; // already running

  task = cron.schedule(CRON_EXPRESSION, () => {
    runSyncCycle(); // errors andar handle hote hain
  });

  console.log(`[CoinSwitch Sync] Started (cron: ${CRON_EXPRESSION})`);
}

function stopCoinswitchOrderSync() {
  if (task) {
    task.stop();
    task = null;
  }
  console.log("[CoinSwitch Sync] Stopped");
}

module.exports = { startCoinswitchOrderSync, stopCoinswitchOrderSync };

/*
Chalte hue sync ko band karne ke 3 tareeke hain. Aapki zaroorat ke hisaab se chuno.

Tareeka 1: Flag false + restart (sabse simple)
config.env mein ENABLE_COINSWITCH_ORDER_SYNC=false karo.
Server restart karo (pm2 restart <name> ya node dobara run).
*/