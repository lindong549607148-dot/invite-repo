const express = require('express');
const router = express.Router();
const { ok, fail, BAD_REQUEST, FORBIDDEN } = require('../utils/resp');
const orderService = require('../services/orderService');
const productService = require('../services/productService');
const { store } = require('../store/memory');
const orderRateLimit = require('../middlewares/orderRateLimit');
const ipRateLimit = require('../middlewares/ipRateLimit');
const featureFlags = require('../config/featureFlags');

function requireBody(req, res, keys, next) {
  const missing = keys.filter((k) => req.body[k] === undefined || req.body[k] === '');
  if (missing.length) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  next();
}

router.post('/create', ipRateLimit, orderRateLimit, (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { idempotencyKey, skuId, qty, amount, addressHash } = req.body;
    const hasKey = idempotencyKey !== undefined && idempotencyKey !== '';
    const key = hasKey ? String(idempotencyKey) : null;
    if (hasKey) {
      const exists = store.orderIdempotency.find((r) => r.key === key);
      if (exists) {
        if (exists.userId !== userId) {
          return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
        }
        if (skuId && (String(skuId) !== exists.skuId || Number(qty) !== exists.qty)) {
          return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
        }
        return res.json(ok({ orderId: exists.orderId, idempotent: true }));
      }
    }

    let finalAmount = null;
    let finalSkuId = null;
    let finalQty = null;

    if (skuId != null) {
      if (!hasKey) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      finalSkuId = String(skuId);
      finalQty = Math.round(Number(qty));
      if (!Number.isFinite(finalQty) || finalQty <= 0) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      const sku = store.productSkus.find((s) => s.id === finalSkuId);
      if (!sku) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      finalAmount = Math.round(Number(sku.price) * finalQty);
      const reserve = productService.reserveStock(finalSkuId, finalQty, { idempotencyKey: key });
      if (!reserve.ok) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
    } else if (amount != null) {
      finalAmount = Math.round(Number(amount));
      if (!Number.isFinite(finalAmount) || finalAmount < 0) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
    } else {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }

    const options = addressHash != null ? { addressHash } : undefined;
    const order = orderService.create(userId, finalAmount, options);
    if (finalSkuId) {
      order.skuId = finalSkuId;
      order.qty = finalQty;
      order.unitPrice = Math.round(finalAmount / finalQty);
      order.reservationKey = hasKey ? String(idempotencyKey) : null;
      if (!store.orderStockReservations) store.orderStockReservations = {};
      store.orderStockReservations[order.orderId] = {
        skuId: finalSkuId,
        qty: finalQty,
        reservationKey: order.reservationKey,
        released: false,
      };
    }
    if (hasKey) {
      store.orderIdempotency.push({
        key,
        orderId: order.orderId,
        userId,
        skuId: finalSkuId,
        qty: finalQty,
        amount: finalAmount,
        createdAt: new Date().toISOString(),
      });
    }
    res.json(ok({ orderId: order.orderId }));
  } catch (err) {
    next(err);
  }
});

router.get('/my', (req, res, next) => {
  try {
    const userId = req.user.userId;
    const list = orderService.getOrdersByUser(userId);
    res.json(ok(list));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/logistics', (req, res, next) => {
  try {
    if (!featureFlags.ENABLE_LOGISTICS_API) {
      return res.status(403).json({ code: 4030, msg: 'forbidden' });
    }
    const order = orderService.getOrder(req.params.id);
    if (!order) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    if (order.userId !== req.user.userId) {
      return res.status(403).json(fail(FORBIDDEN, 'forbidden'));
    }
    if (order.status !== 'SHIPPED' && order.status !== 'RECEIVED') {
      return res.status(400).json({ code: 4003, msg: 'invalid_state' });
    }
    const shippedAt = order.shippedAt ? new Date(order.shippedAt) : new Date();
    const t1 = shippedAt.toISOString();
    const t2 = new Date(shippedAt.getTime() + 4 * 3600 * 1000).toISOString();
    const t3 = new Date(shippedAt.getTime() + 24 * 3600 * 1000).toISOString();
    const status = order.receivedAt ? 'DELIVERED' : (Date.now() < new Date(t2).getTime() ? 'SHIPPED' : 'IN_TRANSIT');
    res.json(ok({
      carrier: order.expressCompanyCode || order.carrier || null,
      trackingNo: order.trackingNo || null,
      status,
      traces: [
        { at: t1, desc: '已发货' },
        { at: t2, desc: '运输中' },
        { at: t3, desc: '派送中' },
      ],
    }));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const order = orderService.getOrder(req.params.id);
    if (!order) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    if (order.userId !== req.user.userId) {
      return res.status(403).json(fail(FORBIDDEN, 'forbidden'));
    }
    return res.json(ok(order));
  } catch (err) {
    next(err);
  }
});

router.post('/ship', (req, res, next) => {
  try {
    requireBody(req, res, ['orderId', 'expressCompanyCode', 'trackingNo'], () => {
      const { orderId, expressCompanyCode, trackingNo } = req.body;
      const order = orderService.getOrder(orderId);
      if (!order) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      if (order.userId !== req.user.userId) {
        return res.status(403).json(fail(FORBIDDEN, 'forbidden'));
      }
      const updated = orderService.ship(orderId, expressCompanyCode, trackingNo);
      if (!updated) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      res.json(ok({ orderId: updated.orderId, status: updated.status }));
    });
  } catch (err) {
    next(err);
  }
});

router.post('/receive', (req, res, next) => {
  try {
    requireBody(req, res, ['orderId', 'mode'], () => {
      const { orderId, mode } = req.body;
      if (mode !== 'manual' && mode !== 'auto') {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      const order = orderService.getOrder(orderId);
      if (!order) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      if (order.userId !== req.user.userId) {
        return res.status(403).json(fail(FORBIDDEN, 'forbidden'));
      }
      const updated = orderService.receive(orderId, mode);
      if (!updated) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      res.json(ok({ orderId: updated.orderId, status: updated.status }));
    });
  } catch (err) {
    next(err);
  }
});

router.post('/cancel', (req, res, next) => {
  try {
    requireBody(req, res, ['orderId'], () => {
      const { orderId } = req.body;
      const order = orderService.getOrder(orderId);
      if (!order) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      if (order.userId !== req.user.userId) {
        return res.status(403).json(fail(FORBIDDEN, 'forbidden'));
      }
      if (order.status === 'CLOSED') {
        return res.json(ok({ orderId: order.orderId }));
      }
      if (order.status !== 'CREATED') {
        return res.status(400).json({ code: 4003, msg: 'invalid_state' });
      }
      order.status = 'CLOSED';
      order.closedAt = new Date().toISOString();
      order.closeReason = 'user_cancel';
      const productService = require('../services/productService');
      productService.releaseReservedStock({ orderId: order.orderId, skuId: order.skuId, qty: order.qty });
      return res.json(ok({ orderId: order.orderId }));
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refund', (req, res, next) => {
  try {
    requireBody(req, res, ['orderId', 'reason'], () => {
      const { orderId, reason } = req.body;
      const order = orderService.getOrder(orderId);
      if (!order) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      if (order.userId !== req.user.userId) {
        return res.status(403).json(fail(FORBIDDEN, 'forbidden'));
      }
      const updated = orderService.refund(orderId, reason);
      if (!updated) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      res.json(ok({ orderId: updated.orderId, status: updated.status }));
    });
  } catch (err) {
    next(err);
  }
});


module.exports = router;
