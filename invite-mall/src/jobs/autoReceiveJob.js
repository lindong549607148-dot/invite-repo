/**
 * 自动收货任务：将超时已发货订单自动确认收货。
 */
const featureFlags = require('../config/featureFlags');

function autoReceiveJob(store, orderService, config, logger) {
  const log = logger || console;
  if (!featureFlags.ENABLE_AUTO_RECEIVE) {
    log.log('[autoReceive] disabled');
    return { ok: true, skipped: true };
  }
  const now = Date.now();
  const days = Number.isFinite(config.autoReceiveDays) ? config.autoReceiveDays : 10;
  const thresholdMs = days * 86400 * 1000;
  let count = 0;

  for (const order of store.orders) {
    if (order.status !== 'SHIPPED' || !order.shippedAt) continue;
    const shippedAt = new Date(order.shippedAt).getTime();
    if (Number.isNaN(shippedAt)) continue;
    if (now - shippedAt < thresholdMs) continue;
    try {
      const updated = orderService.receiveOrder(order.orderId, { mode: 'auto', bypassOwnerCheck: true });
      if (updated) {
        count += 1;
        log.log('[autoReceive] order received', order.orderId);
        // 预留 hook：裂变相关流程在此触发
      }
    } catch (err) {
      log.error('[autoReceive] receive error', order.orderId, err);
    }
  }

  return { ok: true, count };
}

module.exports = { autoReceiveJob };
