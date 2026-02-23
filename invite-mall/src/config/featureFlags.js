/**
 * 灰度功能开关：默认开启，可由环境变量覆盖。
 * 支持在运行期内存动态覆盖（不影响 env 默认值）。
 */
const FLAG_DEFAULT = '1';

const { store } = require('../store/memory');

const baseFlags = {
  ENABLE_PAYMENT: (process.env.ENABLE_PAYMENT || FLAG_DEFAULT) === '1',
  ENABLE_AUTO_RECEIVE: (process.env.ENABLE_AUTO_RECEIVE || FLAG_DEFAULT) === '1',
  ENABLE_STOCK_DEDUCT: (process.env.ENABLE_STOCK_DEDUCT || FLAG_DEFAULT) === '1',
  ENABLE_ORDER_SHIP: (process.env.ENABLE_ORDER_SHIP || FLAG_DEFAULT) === '1',
  ENABLE_PRODUCT_MODULE: (process.env.ENABLE_PRODUCT_MODULE || FLAG_DEFAULT) === '1',
  ENABLE_RISK_DEVICE: (process.env.ENABLE_RISK_DEVICE || FLAG_DEFAULT) === '1',
  ENABLE_RISK_ADDRESS: (process.env.ENABLE_RISK_ADDRESS || FLAG_DEFAULT) === '1',
  ENABLE_RISK_PHONE: (process.env.ENABLE_RISK_PHONE || FLAG_DEFAULT) === '1',
  ENABLE_ORDER_EXPIRE_CLOSE: (process.env.ENABLE_ORDER_EXPIRE_CLOSE || FLAG_DEFAULT) === '1',
  ENABLE_PAYOUT_LEDGER: (process.env.ENABLE_PAYOUT_LEDGER || FLAG_DEFAULT) === '1',
  ENABLE_RISK_BLOCKING: process.env.ENABLE_RISK_BLOCKING === '1',
  ENABLE_TASK_PROGRESS_API: (process.env.ENABLE_TASK_PROGRESS_API || FLAG_DEFAULT) === '1',
  ENABLE_LOGISTICS_API: (process.env.ENABLE_LOGISTICS_API || FLAG_DEFAULT) === '1',
};

const persisted = {};
if (store && store.featureFlagsSnapshot && typeof store.featureFlagsSnapshot === 'object') {
  Object.assign(persisted, store.featureFlagsSnapshot);
}

const overrides = {};

function isEnabled(flag) {
  return Boolean(flag);
}

function getFlag(key) {
  if (Object.prototype.hasOwnProperty.call(overrides, key)) return Boolean(overrides[key]);
  if (Object.prototype.hasOwnProperty.call(persisted, key)) return Boolean(persisted[key]);
  return Boolean(baseFlags[key]);
}

function setFlag(key, value) {
  if (!Object.prototype.hasOwnProperty.call(baseFlags, key)) return false;
  overrides[key] = Boolean(value);
  persisted[key] = overrides[key];
  if (store) store.featureFlagsSnapshot = { ...persisted };
  return true;
}

function getAllFlags() {
  const result = {};
  Object.keys(baseFlags).forEach((key) => {
    result[key] = getFlag(key);
  });
  if (store && store.featureFlagsSnapshot == null) {
    store.featureFlagsSnapshot = { ...persisted };
  }
  return result;
}

const exported = { isEnabled, setFlag, getAllFlags };
Object.keys(baseFlags).forEach((key) => {
  Object.defineProperty(exported, key, {
    enumerable: true,
    get() {
      return getFlag(key);
    },
  });
});

module.exports = exported;
