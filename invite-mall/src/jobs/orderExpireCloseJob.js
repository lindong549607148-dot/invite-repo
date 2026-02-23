/**
 * 订单超时未支付自动关单 + 释放库存。
 */
const featureFlags = require('../config/featureFlags');
const productService = require('../services/productService');

function orderExpireCloseJob(store, config, logger) {
  const log = logger || console;
  if (!featureFlags.ENABLE_ORDER_EXPIRE_CLOSE) {
    return { ok: true, skipped: true };
  }
  const minutes = Number.isFinite(config.orderPayExpireMinutes) ? config.orderPayExpireMinutes : 30;
  const thresholdMs = minutes * 60 * 1000;
  const now = Date.now();
  let closed = 0;

  for (const order of store.orders) {
    if (order.status !== 'CREATED') continue;
    const createdAt = new Date(order.createdAt || 0).getTime();
    if (!createdAt || Number.isNaN(createdAt)) continue;
    if (now - createdAt < thresholdMs) continue;
    if (order.status === 'CLOSED') continue;
    order.status = 'CLOSED';
    order.closedAt = new Date().toISOString();
    order.closeReason = 'pay_timeout';
    productService.releaseReservedStock({ orderId: order.orderId, skuId: order.skuId, qty: order.qty });
    log.log('[expireClose] closed order', { orderId: order.orderId, reason: 'pay_timeout' });
    closed += 1;
  }

  return { ok: true, closed };
}

module.exports = { orderExpireCloseJob };
