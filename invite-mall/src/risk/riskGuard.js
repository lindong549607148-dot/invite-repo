/**
 * 风控校验：bind-helper / bind-order 入口
 * 返回 { ok: true } 或 { ok: false, action, code, msg, detail }
 */
const riskConfig = require('./riskConfig');
const riskStore = require('./riskStore');

const RISK_CODE = 4501;
const DAY_TTL = 86400 * 2;

function getDateKey() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function worstAction(a, b) {
  const order = { log: 0, review: 1, intercept: 2 };
  return (order[b] || 0) > (order[a] || 0) ? b : a;
}

function checkBindHelper({ inviterUserId, helperUserId, ip, deviceId, taskNo }) {
  if (!riskConfig.shouldApplyToUser(helperUserId)) return { ok: true };

  let action = 'log';
  let msg = '';
  const detail = { rules: [] };

  const dateKey = getDateKey();

  if (riskConfig.ipLimit.enabled && ip && ip !== 'unknown') {
    const key = `risk:ip:${dateKey}:${ip}`;
    const count = riskStore.get(key) || 0;
    if (count >= riskConfig.ipLimit.maxPerDay) {
      detail.rules.push({ rule: 'ip', count, max: riskConfig.ipLimit.maxPerDay });
      action = worstAction(action, riskConfig.ipLimit.mode);
      msg = msg || 'ip_limit';
    }
  }

  if (riskConfig.deviceLimit.enabled && deviceId && deviceId !== 'unknown') {
    const key = `risk:device:${dateKey}:${deviceId}`;
    const count = riskStore.get(key) || 0;
    if (count >= riskConfig.deviceLimit.maxPerDay) {
      detail.rules.push({ rule: 'device', count, max: riskConfig.deviceLimit.maxPerDay });
      action = worstAction(action, riskConfig.deviceLimit.mode);
      msg = msg || 'device_limit';
    }
  }

  if (riskConfig.graphLimit.enabled) {
    const key = `risk:graph:helper:${dateKey}:${helperUserId}`;
    const alreadyIn = riskStore.hasSet(key, inviterUserId);
    const size = riskStore.getSetSize(key);
    if (!alreadyIn && size >= riskConfig.graphLimit.helperMaxInvitersPerDay) {
      detail.rules.push({ rule: 'graph', inviters: size, max: riskConfig.graphLimit.helperMaxInvitersPerDay });
      action = worstAction(action, riskConfig.graphLimit.mode);
      msg = msg || 'graph_limit';
    }
  }

  if (action === 'off' || (!msg && action === 'log')) return { ok: true };
  if (msg) {
    return { ok: false, action, code: RISK_CODE, msg, detail };
  }
  return { ok: true };
}

function checkBindOrder({ inviterUserId, helperUserId, ip, deviceId, taskNo, order }) {
  if (!riskConfig.shouldApplyToUser(helperUserId)) return { ok: true };

  const bindHelperResult = checkBindHelper({ inviterUserId, helperUserId, ip, deviceId, taskNo });
  if (!bindHelperResult.ok) return bindHelperResult;

  let action = 'log';
  let msg = '';
  const detail = bindHelperResult.detail ? { ...bindHelperResult.detail, rules: [...(bindHelperResult.detail.rules || [])] } : { rules: [] };

  if (riskConfig.addressLimit.enabled && order && order.addressHash) {
    const dateKey = getDateKey();
    const key = `risk:address:${dateKey}:${order.addressHash}`;
    const count = riskStore.get(key) || 0;
    if (count >= riskConfig.addressLimit.maxPerDay) {
      detail.rules.push({ rule: 'address', count, max: riskConfig.addressLimit.maxPerDay });
      action = worstAction(action, riskConfig.addressLimit.mode);
      msg = 'address_limit';
    }
  }

  if (msg) {
    return { ok: false, action, code: RISK_CODE, msg, detail };
  }
  return { ok: true };
}

function recordHelperInviter(helperUserId, inviterUserId) {
  const dateKey = getDateKey();
  const key = `risk:graph:helper:${dateKey}:${helperUserId}`;
  riskStore.addSet(key, inviterUserId, DAY_TTL);
}

function recordIpHelper(ip) {
  if (!ip || ip === 'unknown') return;
  const dateKey = getDateKey();
  riskStore.incr(`risk:ip:${dateKey}:${ip}`, DAY_TTL);
}

function recordDeviceHelper(deviceId) {
  if (!deviceId || deviceId === 'unknown') return;
  const dateKey = getDateKey();
  riskStore.incr(`risk:device:${dateKey}:${deviceId}`, DAY_TTL);
}

function recordAddressHelper(addressHash) {
  if (!addressHash) return;
  const dateKey = getDateKey();
  riskStore.incr(`risk:address:${dateKey}:${addressHash}`, DAY_TTL);
}

module.exports = {
  checkBindHelper,
  checkBindOrder,
  recordHelperInviter,
  recordIpHelper,
  recordDeviceHelper,
  recordAddressHelper,
  RISK_CODE,
};
