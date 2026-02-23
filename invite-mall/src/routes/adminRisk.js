/**
 * 管理端风控统计接口。
 */
const express = require('express');
const { ok } = require('../utils/resp');
const riskSignals = require('../risk/riskSignals');

const router = express.Router();

router.get('/stats', (req, res) => {
  const stats = riskSignals.getRiskStats();
  res.json(ok({
    deviceHitsToday: stats.deviceHits || 0,
    addressHitsToday: stats.addressHits || 0,
    phoneHitsToday: stats.phoneHits || 0,
  }));
});

module.exports = router;
