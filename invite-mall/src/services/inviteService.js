const { store, nextId, getTodayDate } = require('../store/memory');
const config = require('../config');
const { structuredLog } = require('../logger');
const featureFlags = require('../config/featureFlags');
const payoutLedgerService = require('./payoutLedgerService');

const TASK_STATUS = {
  PENDING: 'PENDING',             // 进行中
  QUALIFIED: 'QUALIFIED',         // 已达标，未到结算日（payout_at 到期后由调度器改为 PENDING_PAYOUT）
  PENDING_PAYOUT: 'PENDING_PAYOUT', // 达标且已到期，待审核
  PAID_OUT: 'PAID_OUT',           // 已打款
  REVOKED: 'REVOKED',             // 已撤销
};

const HELP_STATUS = {
  BOUND: 'BOUND',    // 已绑定，未下单或未收货
  VALID: 'VALID',    // 有效助力（订单已 RECEIVED）
  INVALID: 'INVALID', // 退款/关闭导致无效
};

const HELPER_STATUS = {
  BOUND: 'BOUND',           // 正常，计入进度
  PENDING_REVIEW: 'PENDING_REVIEW', // 风控待审，不计入 progress
  REJECTED: 'REJECTED',     // 管理员拒绝，不计入
};

/**
 * 发起任务：校验今日 quota，创建任务
 */
function startTask(userId, orderId) {
  const quotaService = require('./quotaService');
  const orderService = require('./orderService');

  if (!quotaService.canStartTask(userId)) return { err: 'quota_exceeded' };
  const order = orderService.getOrder(orderId);
  if (!order || order.userId !== userId) return { err: 'order_not_found' };
  const existing = store.tasks.find((t) => t.orderId === orderId);
  if (existing) return { err: 'order_already_has_task' };

  const taskId = nextId('task');
  const taskNo = `T${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6)}`;
  const task = {
    taskId,
    taskNo,
    userId,
    orderId,
    status: TASK_STATUS.PENDING,
    requiredHelpers: config.requiredHelpers,
    createdAt: new Date().toISOString(),
  };
  store.tasks.push(task);
  quotaService.useQuota(userId);
  return { task };
}

/**
 * 绑定助力：同人同任务仅一次
 * @param {string} taskNo
 * @param {string} helperUserId
 * @param {object} [options] - { helperStatus: 'BOUND'|'PENDING_REVIEW' } 风控 review 时传 PENDING_REVIEW
 */
function bindHelper(taskNo, helperUserId, options) {
  const task = store.tasks.find((t) => t.taskNo === taskNo);
  if (!task) return { err: 'task_not_found' };
  if (task.status !== TASK_STATUS.PENDING) return { err: 'task_not_pending' };
  const allowDup = config.allowDupHelper === true;
  const exists = store.helps.some((h) => h.taskId === task.taskId && h.helperUserId === helperUserId);
  if (!allowDup && exists) return { err: 'already_bound' };

  const helperStatus = (options && options.helperStatus) || HELPER_STATUS.BOUND;
  const helpId = nextId('help');
  const help = {
    helpId,
    taskId: task.taskId,
    helperUserId,
    orderId: null,
    status: HELP_STATUS.BOUND,
    helperStatus,
    createdAt: new Date().toISOString(),
  };
  store.helps.push(help);
  return { help };
}

/**
 * 订单确认收货时：若该订单是某 help 的 orderId，则标记 help 有效，并检查任务是否达标
 */
function onOrderReceived(orderId) {
  const help = store.helps.find((h) => h.orderId === orderId);
  if (!help) return;
  if (help.status !== HELP_STATUS.BOUND) return;

  const order = store.orders.find((o) => o.orderId === orderId);
  const receivedAt = order && order.receivedAt ? order.receivedAt : new Date().toISOString();

  help.status = HELP_STATUS.VALID;
  help.receivedAt = receivedAt;

  const task = store.tasks.find((t) => t.taskId === help.taskId);
  if (!task || task.status !== TASK_STATUS.PENDING) return;

  const validHelps = store.helps.filter(
    (h) => h.taskId === task.taskId && h.status === HELP_STATUS.VALID && h.helperStatus !== HELPER_STATUS.PENDING_REVIEW && h.helperStatus !== HELPER_STATUS.REJECTED
  );
  if (validHelps.length >= task.requiredHelpers) {
    const receivedAts = validHelps.map((h) => h.receivedAt).filter(Boolean);
    const qualifiedAt = receivedAts.length ? new Date(Math.max(...receivedAts.map((d) => new Date(d).getTime()))).toISOString() : new Date().toISOString();
    let payoutAt = new Date(new Date(qualifiedAt).getTime() + config.payoutDelayDays * 24 * 60 * 60 * 1000).toISOString();
    const risk = payoutLedgerService.computeRisk(task);
    if (featureFlags.ENABLE_RISK_BLOCKING && risk.level === 'MEDIUM' && !task.riskDelayApplied) {
      const extra = config.payoutDelayRiskMediumDays * 24 * 60 * 60 * 1000;
      payoutAt = new Date(new Date(payoutAt).getTime() + extra).toISOString();
      task.riskDelayApplied = true;
    }
    task.qualifiedAt = qualifiedAt;
    task.payoutAt = payoutAt;
    task.status = TASK_STATUS.QUALIFIED;
    structuredLog('[task]', { taskId: task.taskId, userId: task.userId, event: 'qualified' });
    payoutLedgerService.upsertFromTask(task);
  }
}

/**
 * 订单退款时：若该订单是助力单，标记 help 无效，若任务已达标则 REVOKED
 */
function onOrderRefunded(orderId) {
  const help = store.helps.find((h) => h.orderId === orderId);
  if (!help) return;
  help.status = HELP_STATUS.INVALID;
  help.invalidAt = new Date().toISOString();

  const task = store.tasks.find((t) => t.taskId === help.taskId);
  if (!task) return;
  if (task.status === TASK_STATUS.QUALIFIED || task.status === TASK_STATUS.PENDING_PAYOUT || task.status === TASK_STATUS.PENDING) {
    task.status = TASK_STATUS.REVOKED;
    task.revokedAt = new Date().toISOString();
  }
}

/**
 * 将某 help 关联的订单设为 orderId（由业务层在“下单”后调用，本骨架里 B/C 下单用 orders/create，此处提供关联接口）
 * 约定：助力人 B/C 先 bind-helper，再 create order，再在本处或订单创建时把 orderId 绑到 help 上。
 * 为简单起见，我们在 orders 路由里不自动绑 help；这里提供 setHelpOrder 供 tasks 或 orders 调用。
 */
function setHelpOrder(helpId, orderId) {
  const help = store.helps.find((h) => h.helpId === helpId);
  if (!help) return null;
  help.orderId = orderId;
  return help;
}

/**
 * 根据 taskNo + helperUserId 找到 help，绑定 orderId
 */
function bindOrderToHelp(taskNo, helperUserId, orderId) {
  const task = store.tasks.find((t) => t.taskNo === taskNo);
  if (!task) return null;
  const help = store.helps.find((h) => h.taskId === task.taskId && h.helperUserId === helperUserId);
  if (!help || help.orderId) return null;
  const orderAlreadyBound = store.helps.some((h) => h.orderId === orderId);
  if (orderAlreadyBound) return null;
  help.orderId = orderId;
  return help;
}

/**
 * 任务详情：状态、进度、helpers 列表、qualified_at、payout_at 倒计时
 */
function getTaskDetail(taskId) {
  const task = store.tasks.find((t) => t.taskId === taskId);
  if (!task) return null;
  const helps = store.helps.filter((h) => h.taskId === taskId);
  const validCount = helps.filter(
    (h) => h.status === HELP_STATUS.VALID && h.helperStatus !== HELPER_STATUS.PENDING_REVIEW && h.helperStatus !== HELPER_STATUS.REJECTED
  ).length;
  const now = new Date();
  let payoutCountdown = null;
  if (task.payoutAt) {
    const end = new Date(task.payoutAt).getTime();
    if (end > now.getTime()) payoutCountdown = Math.ceil((end - now.getTime()) / 1000);
  }
  return {
    ...task,
    progress: validCount,
    required: task.requiredHelpers,
    helpers: helps.map((h) => ({
      helpId: h.helpId,
      helperUserId: h.helperUserId,
      orderId: h.orderId,
      status: h.status,
      helperStatus: h.helperStatus || HELPER_STATUS.BOUND,
      receivedAt: h.receivedAt,
    })),
    qualified_at: task.qualifiedAt || null,
    payout_at: task.payoutAt || null,
    payoutCountdown,
  };
}

/**
 * 用户任务列表（返回 view 层结构，与 detail 一致）
 */
function getTaskList(userId) {
  const taskView = require('./taskView');
  const list = store.tasks.filter((t) => t.userId === userId);
  return list.map((t) => taskView.buildTaskDetail(t.taskId)).filter(Boolean);
}

/**
 * 待审核列表：now >= payout_at 且 status = PENDING_PAYOUT
 */
function getPendingPayoutTasks() {
  const now = new Date().toISOString();
  return store.tasks.filter((t) => t.status === TASK_STATUS.PENDING_PAYOUT && t.payoutAt && t.payoutAt <= now);
}

/**
 * 审核通过 -> PAID_OUT
 */
function approveTask(taskId, note) {
  const task = store.tasks.find((t) => t.taskId === taskId);
  if (!task) return null;
  if (task.status !== TASK_STATUS.PENDING_PAYOUT) return null;
  task.status = TASK_STATUS.PAID_OUT;
  task.paidOutAt = new Date().toISOString();
  task.note = note;
  structuredLog('[payout]', { taskId: task.taskId, userId: task.userId, event: 'approved' });
  payoutLedgerService.updateStatus(task, 'APPROVED', { note });
  return task;
}

/**
 * 审核拒绝 -> REVOKED
 */
function rejectTask(taskId, note) {
  const task = store.tasks.find((t) => t.taskId === taskId);
  if (!task) return null;
  task.status = TASK_STATUS.REVOKED;
  task.revokedAt = task.revokedAt || new Date().toISOString();
  task.note = note;
  payoutLedgerService.updateStatus(task, 'REJECTED', { note });
  return task;
}

/**
 * 根据 taskNo 查 task
 */
function getTaskByTaskNo(taskNo) {
  return store.tasks.find((t) => t.taskNo === taskNo) || null;
}

/**
 * 风控待审列表：包含至少一个 helperStatus=PENDING_REVIEW 的 help 的 task
 */
function getTasksWithPendingReviewHelpers() {
  const taskIds = new Set();
  for (const h of store.helps) {
    if (h.helperStatus === HELPER_STATUS.PENDING_REVIEW) taskIds.add(h.taskId);
  }
  return store.tasks.filter((t) => taskIds.has(t.taskId)).map((t) => getTaskDetail(t.taskId));
}

/**
 * 风控审核通过：将 help.helperStatus 改为 BOUND，并重新计算任务进度（可能触发达标）
 */
function approveRiskHelper(taskId, helperUserId) {
  const help = store.helps.find((h) => h.taskId === taskId && h.helperUserId === helperUserId);
  if (!help) return null;
  if (help.helperStatus !== HELPER_STATUS.PENDING_REVIEW) return help;
  help.helperStatus = HELPER_STATUS.BOUND;
  if (help.status === HELP_STATUS.VALID) {
    const task = store.tasks.find((t) => t.taskId === taskId);
    if (task && task.status === TASK_STATUS.PENDING) {
      const validHelps = store.helps.filter(
        (h) => h.taskId === taskId && h.status === HELP_STATUS.VALID && h.helperStatus !== HELPER_STATUS.PENDING_REVIEW && h.helperStatus !== HELPER_STATUS.REJECTED
      );
      if (validHelps.length >= task.requiredHelpers) {
        const receivedAts = validHelps.map((h) => h.receivedAt).filter(Boolean);
        const qualifiedAt = receivedAts.length ? new Date(Math.max(...receivedAts.map((d) => new Date(d).getTime()))).toISOString() : new Date().toISOString();
        let payoutAt = new Date(new Date(qualifiedAt).getTime() + config.payoutDelayDays * 24 * 60 * 60 * 1000).toISOString();
        const risk = payoutLedgerService.computeRisk(task);
        if (featureFlags.ENABLE_RISK_BLOCKING && risk.level === 'MEDIUM' && !task.riskDelayApplied) {
          const extra = config.payoutDelayRiskMediumDays * 24 * 60 * 60 * 1000;
          payoutAt = new Date(new Date(payoutAt).getTime() + extra).toISOString();
          task.riskDelayApplied = true;
        }
        task.qualifiedAt = qualifiedAt;
        task.payoutAt = payoutAt;
        task.status = TASK_STATUS.QUALIFIED;
        payoutLedgerService.upsertFromTask(task);
      }
    }
  }
  return help;
}

/**
 * 风控审核拒绝：将 help.helperStatus 改为 REJECTED，不计入进度
 */
function rejectRiskHelper(taskId, helperUserId) {
  const help = store.helps.find((h) => h.taskId === taskId && h.helperUserId === helperUserId);
  if (!help) return null;
  help.helperStatus = HELPER_STATUS.REJECTED;
  return help;
}

module.exports = {
  startTask,
  bindHelper,
  bindOrderToHelp,
  setHelpOrder,
  onOrderReceived,
  onOrderRefunded,
  getTaskDetail,
  getTaskList,
  getTaskByTaskNo,
  getPendingPayoutTasks,
  approveTask,
  rejectTask,
  getTasksWithPendingReviewHelpers,
  approveRiskHelper,
  rejectRiskHelper,
  TASK_STATUS,
  HELP_STATUS,
  HELPER_STATUS,
};
