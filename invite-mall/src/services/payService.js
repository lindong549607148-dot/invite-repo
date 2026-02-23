/**
 * 支付服务（微信支付骨架）：mock JSAPI + 通知处理。
 */
const { store, nextId } = require('../store/memory');
const featureFlags = require('../config/featureFlags');
const { assertCanPay } = require('../domain/orderStateMachine');
const orderService = require('./orderService');

const PAY_STATUS = {
  CREATED: 'CREATED',
  PAID: 'PAID',
};

function getOrderPayAmount(order) {
  const amount = Number.isFinite(order.payAmount) ? order.payAmount : order.amount;
  return Math.round(Number(amount) || 0);
}

function findPayment(orderId) {
  return store.payments.find((p) => p.orderId === String(orderId)) || null;
}

function createPaymentRecord(order) {
  const payId = nextId('pay');
  const record = {
    payId,
    orderId: String(order.orderId),
    status: PAY_STATUS.CREATED,
    amount: getOrderPayAmount(order),
    payChannel: 'WECHAT_MOCK',
    createdAt: new Date().toISOString(),
  };
  store.payments.push(record);
  return record;
}

function createPay(orderId) {
  if (!featureFlags.ENABLE_PAYMENT) {
    console.warn('[pay] createPay blocked (feature disabled)', orderId);
    return { ok: false, err: 'feature_disabled' };
  }
  const order = orderService.getOrder(orderId);
  if (!order) {
    console.warn('[pay] order not found', orderId);
    return { ok: false, err: 'order_not_found' };
  }
  try {
    assertCanPay(order);
  } catch (err) {
    console.warn('[pay] status invalid', orderId, err.code || err.message);
    return { ok: false, err: 'order_status_invalid' };
  }

  let payment = findPayment(orderId);
  if (!payment) {
    payment = createPaymentRecord(order);
    console.info('[pay] payment created', payment.payId, orderId);
  } else {
    console.info('[pay] payment exists', payment.payId, orderId);
  }

  const jsapiParams = {
    appId: 'mock-app-id',
    timeStamp: String(Date.now()),
    nonceStr: 'mock-nonce',
    package: `prepay_id=mock_${payment.payId}`,
    signType: 'RSA',
    paySign: 'mock-sign',
  };

  return { ok: true, payId: payment.payId, jsapiParams };
}

function handlePayNotify(data) {
  if (!featureFlags.ENABLE_PAYMENT) {
    console.warn('[pay] notify blocked (feature disabled)');
    return { ok: false, err: 'feature_disabled' };
  }
  const orderId = data && data.orderId ? String(data.orderId) : '';
  if (!orderId) {
    console.warn('[pay] notify missing orderId');
    return { ok: false, err: 'order_id_required' };
  }
  const order = orderService.getOrder(orderId);
  if (!order) {
    console.warn('[pay] notify order not found', orderId);
    return { ok: false, err: 'order_not_found' };
  }

  let payment = findPayment(orderId);
  if (!payment) {
    payment = createPaymentRecord(order);
    console.warn('[pay] notify without payment, created mock record', payment.payId);
  }
  if (payment.status === PAY_STATUS.PAID) {
    console.info('[pay] notify idempotent', orderId);
    return { ok: true, status: 'PAID' };
  }

  try {
    assertCanPay(order);
  } catch (err) {
    console.warn('[pay] notify status invalid', orderId, err.code || err.message);
    return { ok: false, err: 'order_status_invalid' };
  }

  const updated = orderService.pay(orderId, getOrderPayAmount(order));
  if (!updated) {
    console.error('[pay] order pay failed', orderId);
    return { ok: false, err: 'order_pay_failed' };
  }

  payment.status = PAY_STATUS.PAID;
  payment.paidAt = updated.paidAt || new Date().toISOString();
  console.info('[pay] notify success', orderId);
  return { ok: true, status: 'PAID' };
}

function queryPay(orderNo) {
  const payment = findPayment(orderNo);
  if (!payment) return { ok: false, err: 'payment_not_found' };
  return { ok: true, payment };
}

module.exports = {
  createPay,
  handlePayNotify,
  queryPay,
  PAY_STATUS,
};
