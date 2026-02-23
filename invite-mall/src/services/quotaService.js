const { store, getTodayDate } = require('../store/memory');
const config = require('../config');

/**
 * 获取用户当日已用额度
 */
function getUsedQuota(userId) {
  const date = getTodayDate();
  let record = store.dailyQuota.find((q) => q.date === date && q.userId === userId);
  if (!record) {
    record = { date, userId, used_quota: 0, bonus_quota: 0, bonus_claimed_today: 0 };
    store.dailyQuota.push(record);
  }
  return record.used_quota || 0;
}

/**
 * 检查今日是否还可发起任务
 */
function canStartTask(userId) {
  const date = getTodayDate();
  let record = store.dailyQuota.find((q) => q.date === date && q.userId === userId);
  if (!record) {
    record = { date, userId, used_quota: 0, bonus_quota: 0, bonus_claimed_today: 0 };
    store.dailyQuota.push(record);
  }
  const base = parseInt(process.env.DAILY_START_QUOTA ?? config.dailyStartQuota ?? config.dailyBaseQuota ?? '1', 10);
  if (base <= 0) return true;
  const total = base + (record.bonus_quota || 0);
  const used = record.used_quota || 0;
  return used < total;
}

/**
 * 领取 bonus 额度：当日领取次数 < DAILY_BONUS_MAX 则 bonus_quota +1，bonus_claimed_today +1
 * 返回 { err: 'quota_bonus_limit' } 表示已达当日领取上限
 */
function claimBonus(userId) {
  const date = getTodayDate();
  let record = store.dailyQuota.find((q) => q.date === date && q.userId === userId);
  if (!record) {
    record = { date, userId, used_quota: 0, bonus_quota: 0, bonus_claimed_today: 0 };
    store.dailyQuota.push(record);
  }
  const claimed = record.bonus_claimed_today || 0;
  if (claimed >= config.dailyBonusMax) {
    return { err: 'quota_bonus_limit' };
  }
  record.bonus_quota = (record.bonus_quota || 0) + 1;
  record.bonus_claimed_today = claimed + 1;
  const base = config.dailyBaseQuota;
  const bonus = record.bonus_quota;
  const used = record.used_quota || 0;
  const available = Math.max(0, base + bonus - used);
  return {
    quota: { base, bonus, used, available },
  };
}

/**
 * 占用额度：发起任务时 used_quota +1，不因完成与否回退
 */
function useQuota(userId) {
  const date = getTodayDate();
  let record = store.dailyQuota.find((q) => q.date === date && q.userId === userId);
  if (!record) {
    record = { date, userId, used_quota: 0, bonus_quota: 0, bonus_claimed_today: 0 };
    store.dailyQuota.push(record);
  }
  record.used_quota = (record.used_quota || 0) + 1;
}

module.exports = { getUsedQuota, canStartTask, useQuota, claimBonus };
