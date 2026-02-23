const jwt = require('jsonwebtoken');
const { store, nextId } = require('../store/memory');
const { getTodayDate } = require('../store/memory');
const config = require('../config');

/**
 * 模拟登录：按 userName 查找或创建用户，返回 { userId, token }
 */
function login(userName, options) {
  let user = store.users.find((u) => u.userName === userName);
  const phone = options && options.phone ? String(options.phone) : null;
  if (!user) {
    const userId = nextId('user');
    user = { userId, userName, createdAt: new Date().toISOString(), phone: phone || null, riskFlags: {} };
    store.users.push(user);
    const riskSignals = require('../risk/riskSignals');
    if (phone) {
      riskSignals.recordPhoneRegister(phone);
      const hit = riskSignals.checkPhoneLimit(phone);
      if (hit) {
        user.riskFlags.phone_limit = true;
        console.warn('[risk][phone] hit', { phone, count: hit.count, max: hit.max });
      }
    }
  } else if (phone && !user.phone) {
    user.phone = phone;
  }
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
  const token = jwt.sign({ userId: user.userId }, secret, { expiresIn: '7d' });
  return { userId: user.userId, token };
}

/**
 * 获取用户信息 + 今日额度（剩余可发起任务数）
 */
function getMe(userId) {
  const user = store.users.find((u) => u.userId === userId);
  if (!user) return null;

  const date = getTodayDate();
  let quotaRecord = store.dailyQuota.find((q) => q.date === date && q.userId === userId);
  if (!quotaRecord) {
    quotaRecord = { date, userId, used_quota: 0, bonus_quota: 0, bonus_claimed_today: 0 };
    store.dailyQuota.push(quotaRecord);
  }
  const base = config.dailyBaseQuota;
  const bonus = quotaRecord.bonus_quota || 0;
  const totalQuota = base + bonus;
  const used = quotaRecord.used_quota || 0;
  const available = Math.max(0, totalQuota - used);

  return {
    userId: user.userId,
    userName: user.userName,
    createdAt: user.createdAt,
    dailyQuota: {
      base,
      bonus,
      used,
      available,
    },
  };
}

module.exports = { login, getMe };
