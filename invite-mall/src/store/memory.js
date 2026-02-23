/**
 * 内存存储，重启清空。后续可替换为数据库。
 * 结构：users, orders, tasks, helps, dailyQuota, adminRefundQueue, products, productSkus, payments, stockReservations
 */

const store = {
  users: [],           // { userId, userName, createdAt }
  orders: [],          // { orderId, userId, amount, payAmount?, status, paidAt?, expressCompanyCode?, trackingNo?, shippedAt?, receivedAt?, refundedAt?, reason?, inviteTaskId? }
  tasks: [],           // { taskId, taskNo, userId, orderId, status, requiredHelpers, createdAt, qualifiedAt?, payoutAt?, revokedAt?, paidOutAt?, note? }
  helps: [],           // { helpId, taskId, helperUserId, orderId?, status, helperStatus:'BOUND'|'PENDING_REVIEW'|'REJECTED', createdAt, receivedAt?, invalidAt? }
  dailyQuota: [],      // { date, userId, used_quota, bonus_quota, bonus_claimed_today }  date = YYYY-MM-DD
  adminRefundQueue: [], // 仅作记录用，待审核任务从 tasks 中 status=PENDING_PAYOUT 且 now>=payout_at 查询
  products: [],        // { id, title, coverImage, price, originalPrice, status, categoryId, createdAt }
  productSkus: [],     // { id, productId, skuName, price, stock, status, createdAt }
  payments: [],        // { payId, orderId, status, amount, payChannel, createdAt, paidAt? }
  stockReservations: [], // { reservationKey, skuId, qty, status, createdAt }
  orderIdempotency: [], // { key, orderId, userId, skuId, qty, amount, createdAt }
  featureFlagsSnapshot: null, // { [key]: boolean } 灰度开关持久化快照
  featureFlagAuditLogs: [], // { id, at, adminKeyMasked, ip, key, from, to }
  riskStats: { date: null, deviceHits: 0, addressHits: 0, phoneHits: 0 },
  orderStockReservations: {}, // { [orderId]: { skuId, qty, reservationKey?, released? } }
  payoutLedger: { byTaskId: {}, list: [] }, // 免单结算账本
};

let idSeq = { user: 1, order: 1, task: 1, help: 1, product: 1, sku: 1, pay: 1, ledger: 1 };

function nextId(key) {
  return String(idSeq[key]++);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  store,
  nextId,
  getTodayDate,
};
