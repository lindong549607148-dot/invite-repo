/**
 * 风控配置：从 env 读取（运行时读，便于测试 beforeAll 改 env）
 * 支持灰度与各规则开关/模式/阈值
 */
require('dotenv').config();

function getGlobalPercent() {
  return parseInt(process.env.RISK_GLOBAL_PERCENT || '100', 10);
}

const ipLimit = {
  get enabled() {
    return process.env.RISK_IP_LIMIT_ENABLED === 'true';
  },
  get mode() {
    return process.env.RISK_IP_MODE || 'log';
  },
  get maxPerDay() {
    return parseInt(process.env.RISK_IP_HELPER_MAX_PER_DAY || '3', 10);
  },
};

const deviceLimit = {
  get enabled() {
    return process.env.RISK_DEVICE_LIMIT_ENABLED === 'true';
  },
  get mode() {
    return process.env.RISK_DEVICE_MODE || 'review';
  },
  get maxPerDay() {
    return parseInt(process.env.RISK_DEVICE_HELPER_MAX_PER_DAY || '2', 10);
  },
};

const addressLimit = {
  get enabled() {
    return process.env.RISK_ADDRESS_LIMIT_ENABLED === 'true';
  },
  get mode() {
    return process.env.RISK_ADDRESS_MODE || 'review';
  },
  get maxPerDay() {
    return parseInt(process.env.RISK_ADDRESS_MAX_PER_DAY || '2', 10);
  },
};

const graphLimit = {
  get enabled() {
    return process.env.RISK_GRAPH_ENABLED === 'true';
  },
  get mode() {
    return process.env.RISK_GRAPH_MODE || 'log';
  },
  get helperMaxInvitersPerDay() {
    return parseInt(process.env.RISK_GRAPH_HELPER_MAX_INVITERS_PER_DAY || '1', 10);
  },
};

function isRiskEnabled() {
  return process.env.RISK_ENABLED === '1';
}

function shouldApplyToUser(userId) {
  if (!isRiskEnabled()) return false;
  const globalPercent = getGlobalPercent();
  if (globalPercent >= 100) return true;
  if (globalPercent <= 0) return false;
  const str = String(userId);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (h % 100) < globalPercent;
}

module.exports = {
  getGlobalPercent,
  isRiskEnabled,
  ipLimit,
  deviceLimit,
  addressLimit,
  graphLimit,
  shouldApplyToUser,
};
