/**
 * 任务详情 view 层：拼多多式进度展示，聚合 task + helpers + users + orders
 */
const { store } = require('../store/memory');
const config = require('../config');
const inviteService = require('./inviteService');
const orderService = require('./orderService');
const payoutLedgerService = require('./payoutLedgerService');

const DEFAULT_AVATAR = 'https://cdn.example.com/default-avatar.png';

const TASK_STATUS_VIEW = {
  PENDING: 'HELPING',
  QUALIFIED: 'QUALIFIED',
  PENDING_PAYOUT: 'PENDING_PAYOUT',
  PAID_OUT: 'PAID_OUT',
  REVOKED: 'REJECTED',
};

const HELPER_STATUS_VIEW = {
  BOUND: 'BOUND',
  ORDER_BOUND: 'ORDER_BOUND',
  SHIPPED: 'SHIPPED',
  RECEIVED: 'RECEIVED',
  REJECTED: 'REJECTED',
  PENDING_REVIEW: 'PENDING_REVIEW',
};

function mapHelperViewStatus(help, order) {
  const hs = help.helperStatus || 'BOUND';
  if (hs === 'REJECTED') return HELPER_STATUS_VIEW.REJECTED;
  if (hs === 'PENDING_REVIEW') return HELPER_STATUS_VIEW.PENDING_REVIEW;
  if (help.status === 'VALID') return HELPER_STATUS_VIEW.RECEIVED;
  if (!order) return HELPER_STATUS_VIEW.BOUND;
  if (order.status === 'SHIPPED') return HELPER_STATUS_VIEW.SHIPPED;
  if (order.status === 'CREATED') return HELPER_STATUS_VIEW.ORDER_BOUND;
  if (order.status === 'REFUNDED') return HELPER_STATUS_VIEW.REJECTED;
  return HELPER_STATUS_VIEW.BOUND;
}

function getRiskEnabled() {
  return process.env.RISK_ENABLED === '1';
}

function computeRiskLevel(task) {
  const marks = task && Array.isArray(task.riskMarks) ? task.riskMarks : [];
  const uniqueRules = Array.from(new Set(marks.map((m) => m.rule)));
  if (uniqueRules.length >= 2) return 'HIGH';
  if (uniqueRules.length === 1) return 'MEDIUM';
  return 'LOW';
}

/**
 * 组装任务详情（供 GET /api/tasks/detail 直接返回）
 */
function buildTaskDetail(taskId) {
  const task = store.tasks.find((t) => t.taskId === taskId);
  if (!task) return null;

  const helps = store.helps.filter((h) => h.taskId === taskId);
  const validCount = helps.filter(
    (h) => h.status === 'VALID' && h.helperStatus !== 'PENDING_REVIEW' && h.helperStatus !== 'REJECTED'
  ).length;
  const required = config.requiredHelpers;
  const now = Date.now();
  let countdown_seconds = 0;
  if (task.payoutAt) {
    const end = new Date(task.payoutAt).getTime();
    if (end > now) countdown_seconds = Math.max(0, Math.floor((end - now) / 1000));
  }

  const has_pending_review = helps.some((h) => h.helperStatus === 'PENDING_REVIEW');

  const helpers = helps.map((h) => {
    const user = store.users.find((u) => u.userId === h.helperUserId);
    const nickname = (user && (user.nickname || user.userName)) || `用户${h.helperUserId}`;
    const avatar = (user && user.avatar) || DEFAULT_AVATAR;
    const order = h.orderId ? orderService.getOrder(h.orderId) : null;
    const status = mapHelperViewStatus(h, order);
    const orderStatus = order ? order.status : null;
    return {
      helperUserId: h.helperUserId,
      nickname,
      avatar,
      status,
      boundAt: h.createdAt || null,
      orderId: h.orderId || null,
      orderStatus,
    };
  });

  return {
    taskId: task.taskId,
    taskNo: task.taskNo,
    status: TASK_STATUS_VIEW[task.status] || task.status,
    progress: validCount,
    required_helpers: required,
    qualified_at: task.qualifiedAt || null,
    payout_at: task.payoutAt || null,
    countdown_seconds,
    helpers,
    ledger: (() => {
      const ledger = payoutLedgerService.getLedgerSummary(task.taskId);
      if (!ledger) return null;
      return {
        payoutStatus: ledger.payoutStatus,
        qualifiedAt: ledger.qualifiedAt,
        payoutAt: ledger.payoutAt,
      };
    })(),
    riskLevel: computeRiskLevel(task),
    riskFlags: {
      reasons: Array.isArray(task.riskMarks) ? task.riskMarks.map((m) => m.rule) : [],
    },
    risk_flags: {
      enabled: getRiskEnabled(),
      has_pending_review: has_pending_review,
      reasons: Array.isArray(task.riskMarks) ? task.riskMarks.map((m) => m.rule) : [],
    },
  };
}

module.exports = { buildTaskDetail, DEFAULT_AVATAR };
