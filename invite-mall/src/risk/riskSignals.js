/**
 * 风险信号：只标记不拦截（设备/地址/手机号）。
 */
const riskStore = require('./riskStore');
const featureFlags = require('../config/featureFlags');
const { store } = require('../store/memory');

const DAY_TTL = 86400 * 2;

function getDateKey() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ensureRiskStats() {
  if (!store.riskStats) {
    store.riskStats = { date: null, deviceHits: 0, addressHits: 0, phoneHits: 0 };
  }
  const today = getTodayStr();
  if (store.riskStats.date !== today) {
    store.riskStats.date = today;
    store.riskStats.deviceHits = 0;
    store.riskStats.addressHits = 0;
    store.riskStats.phoneHits = 0;
  }
}

function bumpRiskStat(type) {
  ensureRiskStats();
  if (type === 'device') store.riskStats.deviceHits += 1;
  if (type === 'address') store.riskStats.addressHits += 1;
  if (type === 'phone') store.riskStats.phoneHits += 1;
}

function getDeviceMax() {
  return parseInt(process.env.RISK_DEVICE_HELPER_MAX_PER_DAY || '5', 10);
}

function getAddressMax() {
  return parseInt(process.env.RISK_ADDRESS_ORDER_MAX_PER_DAY || '5', 10);
}

function getPhoneMax() {
  return parseInt(process.env.RISK_PHONE_REGISTER_MAX_PER_DAY || '3', 10);
}

function markTaskRisk(task, rule, detail) {
  if (!task) return;
  if (!task.riskMarks) task.riskMarks = [];
  const exists = task.riskMarks.some((r) => r.rule === rule);
  if (!exists) {
    task.riskMarks.push({ rule, detail, at: new Date().toISOString() });
  }
}

function recordDeviceHelper(deviceId) {
  if (!deviceId || deviceId === 'unknown') return null;
  const dateKey = getDateKey();
  const key = `risk:device:${dateKey}:${deviceId}`;
  return riskStore.incr(key, DAY_TTL);
}

function recordAddressOrder(addressHash) {
  if (!addressHash) return null;
  const dateKey = getDateKey();
  const key = `risk:address_order:${dateKey}:${addressHash}`;
  return riskStore.incr(key, DAY_TTL);
}

function recordPhoneRegister(phone) {
  if (!phone) return null;
  const dateKey = getDateKey();
  const key = `risk:phone:${dateKey}:${phone}`;
  return riskStore.incr(key, DAY_TTL);
}

function checkDeviceLimit(deviceId) {
  if (!featureFlags.ENABLE_RISK_DEVICE) return null;
  if (!deviceId || deviceId === 'unknown') return null;
  const dateKey = getDateKey();
  const key = `risk:device:${dateKey}:${deviceId}`;
  const count = riskStore.get(key) || 0;
  const max = getDeviceMax();
  if (count > max) {
    bumpRiskStat('device');
    return { rule: 'device', count, max };
  }
  if (count === max) {
    bumpRiskStat('device');
    return { rule: 'device', count, max };
  }
  return null;
}

function checkAddressLimit(addressHash) {
  if (!featureFlags.ENABLE_RISK_ADDRESS) return null;
  if (!addressHash) return null;
  const dateKey = getDateKey();
  const key = `risk:address_order:${dateKey}:${addressHash}`;
  const count = riskStore.get(key) || 0;
  const max = getAddressMax();
  if (count > max) {
    bumpRiskStat('address');
    return { rule: 'address', count, max };
  }
  if (count === max) {
    bumpRiskStat('address');
    return { rule: 'address', count, max };
  }
  return null;
}

function checkPhoneLimit(phone) {
  if (!featureFlags.ENABLE_RISK_PHONE) return null;
  if (!phone) return null;
  const dateKey = getDateKey();
  const key = `risk:phone:${dateKey}:${phone}`;
  const count = riskStore.get(key) || 0;
  const max = getPhoneMax();
  if (count > max) {
    bumpRiskStat('phone');
    return { rule: 'phone', count, max };
  }
  if (count === max) {
    bumpRiskStat('phone');
    return { rule: 'phone', count, max };
  }
  return null;
}

function getRiskStats() {
  ensureRiskStats();
  return { ...store.riskStats };
}

module.exports = {
  markTaskRisk,
  recordDeviceHelper,
  recordAddressOrder,
  recordPhoneRegister,
  checkDeviceLimit,
  checkAddressLimit,
  checkPhoneLimit,
  getRiskStats,
};
