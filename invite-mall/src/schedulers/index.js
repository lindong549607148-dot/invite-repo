/**
 * 调度器：自动收货 + 到期审核扫描
 * createScheduler 返回 { tick, start, stop }，便于测试中手动触发 tick
 */
const { structuredLog } = require('../logger');
const { autoReceiveJob } = require('../jobs/autoReceiveJob');
const { orderExpireCloseJob } = require('../jobs/orderExpireCloseJob');
const payoutLedgerService = require('../services/payoutLedgerService');
const featureFlags = require('../config/featureFlags');

function scanAutoReceiveOrders(store, orderService, config, logger) {
  const result = autoReceiveJob(store, orderService, config, logger);
  if (result && result.count) {
    logger.log('[sched] auto-receive count', result.count);
  }
}

function scanPayoutTasks(store, config, logger) {
  const now = new Date();
  for (const task of store.tasks) {
    if (task.status !== 'QUALIFIED' || !task.payoutAt) continue;
    const payoutAt = new Date(task.payoutAt);
    if (now < payoutAt) continue;
    const risk = payoutLedgerService.computeRisk(task);
    if (featureFlags.ENABLE_RISK_BLOCKING && risk.level === 'HIGH') {
      logger.error('[risk][block]', { taskId: task.taskId, userId: task.userId, riskReasons: risk.reasons });
      continue;
    }
    task.status = 'PENDING_PAYOUT';
    structuredLog('[payout]', { taskId: task.taskId, userId: task.userId, event: 'entered' });
    const exists = store.adminRefundQueue.some((e) => e.taskId === task.taskId);
    if (!exists) {
      store.adminRefundQueue.push({
        taskId: task.taskId,
        enteredAt: new Date().toISOString(),
      });
      logger.log('[sched] task entered payout queue', task.taskId);
    }
    payoutLedgerService.upsertFromTask(task);
  }
}

/**
 * 创建调度器实例，返回 { tick, start, stop }
 * - tick()：执行一次 scanAutoReceiveOrders + scanPayoutTasks（幂等，可多次调用）
 * - start()：按 config.schedIntervalSec 启动 setInterval 调 tick
 * - stop()：清理 interval
 */
function createScheduler({ store, services, config, logger }) {
  const log = logger || console;
  let intervalId = null;

  function tick() {
    try {
      scanAutoReceiveOrders(store, services.orderService, config, log);
      scanPayoutTasks(store, config, log);
      orderExpireCloseJob(store, config, log);
    } catch (err) {
      log.error('[sched] tick error', err);
    }
  }

  function start() {
    if (intervalId) return;
    const intervalMs = (config.schedIntervalSec || 30) * 1000;
    log.log('SCHED enabled, interval', config.schedIntervalSec, 'sec');
    intervalId = setInterval(tick, intervalMs);
    tick();
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { tick, start, stop };
}

/**
 * 启动调度器（生产/开发）：若 SCHED_ENABLED==1 则 start，否则仅打日志
 * 测试环境不调用此方法，由 e2e 手动 createScheduler().tick()
 */
function startSchedulers({ store, services, config, logger }) {
  const log = logger || console;
  if (!config.schedEnabled) {
    log.log('SCHED disabled (SCHED_ENABLED != 1)');
    return;
  }
  const scheduler = createScheduler({ store, services, config, logger });
  scheduler.start();
}

module.exports = { createScheduler, startSchedulers, scanAutoReceiveOrders, scanPayoutTasks };
