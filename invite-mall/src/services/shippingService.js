/**
 * 发货服务：后台发货闭环。
 */
const featureFlags = require('../config/featureFlags');
const { assertCanShip } = require('../domain/orderStateMachine');
const orderService = require('./orderService');

function shipOrder(orderId, payload) {
  if (!featureFlags.ENABLE_ORDER_SHIP) {
    console.warn('[ship] blocked (feature disabled)', orderId);
    return { ok: false, err: 'feature_disabled' };
  }
  const order = orderService.getOrder(orderId);
  if (!order) {
    console.warn('[ship] order not found', orderId);
    return { ok: false, err: 'order_not_found' };
  }
  if (order.status === 'SHIPPED') {
    console.info('[ship] idempotent', orderId);
    return { ok: true, order };
  }
  try {
    assertCanShip(order, { allowUnpaid: false });
  } catch (err) {
    console.warn('[ship] status invalid', orderId, err.code || err.message);
    return { ok: false, err: 'order_status_invalid' };
  }

  const trackingNo = payload && payload.trackingNo ? String(payload.trackingNo) : '';
  const carrier = payload && payload.carrier ? String(payload.carrier) : '';
  if (!trackingNo || !carrier) {
    console.warn('[ship] missing tracking info', orderId);
    return { ok: false, err: 'tracking_required' };
  }

  const updated = orderService.ship(orderId, carrier, trackingNo);
  if (!updated) {
    console.error('[ship] ship failed', orderId);
    return { ok: false, err: 'ship_failed' };
  }
  updated.carrier = carrier;
  updated.trackingNo = trackingNo;
  updated.shippedAt = updated.shippedAt || new Date().toISOString();
  console.info('[ship] ship success', orderId);
  return { ok: true, order: updated };
}

module.exports = { shipOrder };
