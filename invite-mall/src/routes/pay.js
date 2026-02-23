/**
 * 支付路由：创建支付、支付回调。
 */
const express = require('express');
const { ok, fail, BAD_REQUEST } = require('../utils/resp');
const payService = require('../services/payService');
const ipRateLimit = require('../middlewares/ipRateLimit');

const router = express.Router();

function requireBody(req, res, keys, next) {
  const missing = keys.filter((k) => req.body[k] === undefined || req.body[k] === '');
  if (missing.length) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  next();
}

router.post('/create', ipRateLimit, (req, res) => {
  requireBody(req, res, ['orderId'], () => {
    const result = payService.createPay(req.body.orderId);
    if (!result.ok) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    return res.json(ok({ payId: result.payId, jsapiParams: result.jsapiParams }));
  });
});

router.post('/notify', (req, res) => {
  requireBody(req, res, ['orderId'], () => {
    const result = payService.handlePayNotify(req.body);
    if (!result.ok) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    return res.json(ok({ status: result.status }));
  });
});

module.exports = router;
