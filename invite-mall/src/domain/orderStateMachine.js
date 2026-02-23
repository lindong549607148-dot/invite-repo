/**
 * 订单状态机校验：用于订单关键状态流转。
 */
const ORDER_STATUS = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  SHIPPED: 'SHIPPED',
  RECEIVED: 'RECEIVED',
  CLOSED: 'CLOSED',
};

function assertOrderExists(order) {
  if (!order) {
    const err = new Error('order_not_found');
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }
}

function assertCanPay(order) {
  assertOrderExists(order);
  if (order.status !== ORDER_STATUS.CREATED) {
    const err = new Error('order_status_invalid_for_pay');
    err.code = 'ORDER_STATUS_INVALID_FOR_PAY';
    throw err;
  }
}

function assertCanShip(order, options) {
  assertOrderExists(order);
  const allowUnpaid = Boolean(options && options.allowUnpaid);
  if (order.status === ORDER_STATUS.PAID) return;
  if (allowUnpaid && order.status === ORDER_STATUS.CREATED) return;
  const err = new Error('order_status_invalid_for_ship');
  err.code = 'ORDER_STATUS_INVALID_FOR_SHIP';
  throw err;
}

function assertCanReceive(order) {
  assertOrderExists(order);
  if (order.status !== ORDER_STATUS.SHIPPED) {
    const err = new Error('order_status_invalid_for_receive');
    err.code = 'ORDER_STATUS_INVALID_FOR_RECEIVE';
    throw err;
  }
}

function assertCanClose(order) {
  assertOrderExists(order);
  if (order.status !== ORDER_STATUS.RECEIVED) {
    const err = new Error('order_status_invalid_for_close');
    err.code = 'ORDER_STATUS_INVALID_FOR_CLOSE';
    throw err;
  }
}

module.exports = {
  ORDER_STATUS,
  assertCanPay,
  assertCanShip,
  assertCanReceive,
  assertCanClose,
};
