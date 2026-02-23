const { store, nextId } = require('../store/memory');
const inviteService = require('./inviteService');
const {
  ORDER_STATUS,
  assertCanPay,
  assertCanShip,
  assertCanReceive,
  assertCanClose,
} = require('../domain/orderStateMachine');

const LEGACY_STATUS = {
  REFUNDED: 'REFUNDED',
};

/**
 * 创建订单
 * @param {string} userId
 * @param {number} amount
 * @param {object} [options] - { addressHash } 风控同收货地址限制用
 */
function create(userId, amount, options) {
  const orderId = nextId('order');
  const amountInt = Math.round(Number(amount));
  if (!Number.isFinite(amountInt)) {
    console.warn('[order] invalid amount, fallback 0', amount);
  }
  const order = {
    orderId,
    userId,
    amount: Number.isFinite(amountInt) ? amountInt : 0,
    payAmount: Number.isFinite(amountInt) ? amountInt : 0,
    status: ORDER_STATUS.CREATED,
    paidAt: null,
    createdAt: new Date().toISOString(),
    addressHash: options && options.addressHash != null ? options.addressHash : undefined,
    inviteTaskId: options && options.inviteTaskId ? options.inviteTaskId : null,
  };
  store.orders.push(order);
  return order;
}

/**
 * 发货 -> SHIPPED
 */
function ship(orderId, expressCompanyCode, trackingNo) {
  const order = store.orders.find((o) => o.orderId === orderId);
  if (!order) return null;
  if (order.status === ORDER_STATUS.SHIPPED) return order;
  try {
    assertCanShip(order, { allowUnpaid: true });
  } catch (err) {
    console.warn('[order] ship blocked', orderId, err.code || err.message);
    return null;
  }
  order.status = ORDER_STATUS.SHIPPED;
  order.expressCompanyCode = expressCompanyCode;
  order.trackingNo = trackingNo;
  order.shippedAt = new Date().toISOString();
  return order;
}

/**
 * 确认收货 -> RECEIVED（manual 或 auto）
 * 触发助力有效：若该订单是某任务的助力单，则更新 help.receivedAt，并检查任务是否达标
 * @param {string} orderId
 * @param {string} mode - 'manual' | 'auto'
 * @param {object} [options] - { bypassOwnerCheck: true } 供调度器调用，绕过路由层“操作者=订单owner”校验
 */
function receive(orderId, mode, options) {
  const order = store.orders.find((o) => o.orderId === orderId);
  if (!order) return null;
  if (order.status === ORDER_STATUS.RECEIVED) return order;
  try {
    assertCanReceive(order);
  } catch (err) {
    console.warn('[order] receive blocked', orderId, err.code || err.message);
    return null;
  }
  order.status = ORDER_STATUS.RECEIVED;
  order.receivedAt = new Date().toISOString();
  order.receiveMode = mode;
  // 若此订单是助力单，触发助力有效逻辑
  inviteService.onOrderReceived(orderId);
  return order;
}

/**
 * 系统/调度器调用：receiveOrder(orderId, { mode, operatorUserId?, bypassOwnerCheck? })
 * bypassOwnerCheck=true 时跳过 owner 校验（业务层在路由校验）；仍做状态机校验（须为 SHIPPED）
 * 写入 receivedAt、receiveMode，并触发“订单收货 -> 任务进度/达标”逻辑
 */
function receiveOrder(orderId, opts) {
  const mode = opts && opts.mode ? opts.mode : 'auto';
  return receive(orderId, mode, { bypassOwnerCheck: opts && opts.bypassOwnerCheck });
}

/**
 * 退款：订单标记 REFUNDED，若属于助力单则 help 标记 INVALID，并可能将任务 REVOKED
 */
function refund(orderId, reason) {
  const order = store.orders.find((o) => o.orderId === orderId);
  if (!order) return null;
  if (order.status === LEGACY_STATUS.REFUNDED) return order;
  order.status = LEGACY_STATUS.REFUNDED;
  order.refundedAt = new Date().toISOString();
  order.refundReason = reason;
  inviteService.onOrderRefunded(orderId);
  return order;
}

function pay(orderId, payAmount) {
  const order = store.orders.find((o) => o.orderId === orderId);
  if (!order) return null;
  if (order.status === ORDER_STATUS.PAID) return order;
  try {
    assertCanPay(order);
  } catch (err) {
    console.warn('[order] pay blocked', orderId, err.code || err.message);
    return null;
  }
  order.status = ORDER_STATUS.PAID;
  order.payAmount = typeof payAmount === 'number' ? payAmount : order.payAmount;
  order.paidAt = new Date().toISOString();
  return order;
}

function close(orderId) {
  const order = store.orders.find((o) => o.orderId === orderId);
  if (!order) return null;
  if (order.status === ORDER_STATUS.CLOSED) return order;
  try {
    assertCanClose(order);
  } catch (err) {
    console.warn('[order] close blocked', orderId, err.code || err.message);
    return null;
  }
  order.status = ORDER_STATUS.CLOSED;
  order.closedAt = new Date().toISOString();
  return order;
}

function getOrder(orderId) {
  return store.orders.find((o) => o.orderId === orderId) || null;
}

function getOrdersByUser(userId) {
  return store.orders.filter((o) => o.userId === userId);
}

module.exports = {
  create,
  ship,
  receive,
  receiveOrder,
  refund,
  pay,
  close,
  getOrder,
  getOrdersByUser,
  ORDER_STATUS,
};
