require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  autoReceiveDays: parseInt(process.env.AUTO_RECEIVE_DAYS || '10', 10),
  payoutDelayDays: parseInt(process.env.PAYOUT_DELAY_DAYS || '3', 10),
  dailyBaseQuota: parseInt(process.env.DAILY_BASE_QUOTA || '1', 10),
  dailyStartQuota: parseInt(process.env.DAILY_START_QUOTA || process.env.DAILY_BASE_QUOTA || '1', 10),
  dailyBonusMax: parseInt(process.env.DAILY_BONUS_MAX || '1', 10),
  requiredHelpers: parseInt(process.env.REQUIRED_HELPERS || '2', 10),
  allowDupHelper: process.env.ALLOW_DUP_HELPER === '1',
  amountCheckEnabled: process.env.AMOUNT_CHECK_ENABLED === '1',
  schedEnabled: process.env.SCHED_ENABLED === '1',
  schedIntervalSec: parseInt(process.env.SCHED_INTERVAL_SEC || '30', 10),
  orderPayExpireMinutes: parseFloat(process.env.ORDER_PAY_EXPIRE_MINUTES || '30'),
  payoutDelayRiskMediumDays: parseInt(process.env.PAYOUT_DELAY_RISK_MEDIUM_DAYS || '3', 10),
};
