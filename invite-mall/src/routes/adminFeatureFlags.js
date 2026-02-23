/**
 * 后台灰度开关：查询与动态更新（内存级）。
 */
const express = require('express');
const featureFlags = require('../config/featureFlags');
const { ok, fail, BAD_REQUEST } = require('../utils/resp');
const { store } = require('../store/memory');
const { getClientIp } = require('../risk/riskMiddleware');

const router = express.Router();

function maskAdminKey(key) {
  const k = String(key || '');
  if (k.length <= 6) return `${k.slice(0, 2)}***`;
  return `${k.slice(0, 4)}***${k.slice(-2)}`;
}

function pushAuditLog(entry) {
  if (!store.featureFlagAuditLogs) store.featureFlagAuditLogs = [];
  store.featureFlagAuditLogs.push(entry);
  if (store.featureFlagAuditLogs.length > 200) {
    store.featureFlagAuditLogs.shift();
  }
}

router.get('/', (req, res) => {
  const data = featureFlags.getAllFlags();
  res.json(ok(data));
});

router.get('/audit', (req, res) => {
  const list = (store.featureFlagAuditLogs || []).slice().reverse();
  res.json(ok({ list }));
});

router.post('/update', (req, res) => {
  const { key, value } = req.body || {};
  if (!key || typeof value !== 'boolean') {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  const current = featureFlags.getAllFlags()[String(key)];
  const okSet = featureFlags.setFlag(String(key), value);
  if (!okSet) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  const updated = featureFlags.getAllFlags()[String(key)];
  const adminKey = req.headers['x-admin-key'];
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    at: new Date().toISOString(),
    adminKeyMasked: maskAdminKey(adminKey),
    ip: getClientIp(req),
    key: String(key),
    from: current,
    to: updated,
  };
  pushAuditLog(entry);
  return res.json(ok({ key: String(key), value: updated }));
});

module.exports = router;
