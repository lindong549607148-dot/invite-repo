/**
 * 免单结算账本：只在内存中记录。
 */
const { store, nextId } = require('../store/memory');
const featureFlags = require('../config/featureFlags');

function maskAdminKey(key) {
  const k = String(key || '');
  if (k.length <= 6) return `${k.slice(0, 2)}***`;
  return `${k.slice(0, 4)}***${k.slice(-2)}`;
}

function ensureLedger() {
  if (!store.payoutLedger) {
    store.payoutLedger = { byTaskId: {}, list: [] };
  }
}

function computeRisk(task) {
  const marks = task && Array.isArray(task.riskMarks) ? task.riskMarks : [];
  const reasons = Array.from(new Set(marks.map((m) => m.rule)));
  let level = 'LOW';
  if (reasons.length >= 2) level = 'HIGH';
  else if (reasons.length === 1) level = 'MEDIUM';
  return { level, reasons };
}

function upsertFromTask(task) {
  if (!featureFlags.ENABLE_PAYOUT_LEDGER) return null;
  ensureLedger();
  const taskId = String(task.taskId);
  const exists = store.payoutLedger.byTaskId[taskId];
  const now = new Date().toISOString();
  const { level, reasons } = computeRisk(task);
  if (exists) {
    exists.qualifiedAt = task.qualifiedAt || exists.qualifiedAt || null;
    exists.payoutAt = task.payoutAt || exists.payoutAt || null;
    exists.riskLevel = level;
    exists.riskReasons = reasons;
    exists.updatedAt = now;
    return exists;
  }

  const helps = store.helps.filter((h) => h.taskId === task.taskId);
  const helperUserIds = helps.map((h) => h.helperUserId).filter(Boolean);
  const helperOrderIds = helps.map((h) => h.orderId).filter(Boolean);

  const item = {
    id: nextId('ledger'),
    taskId,
    taskNo: task.taskNo,
    userId: task.userId,
    orderId: task.orderId || null,
    helperUserIds,
    helperOrderIds,
    qualifiedAt: task.qualifiedAt || null,
    payoutAt: task.payoutAt || null,
    payoutStatus: 'PENDING',
    riskLevel: level,
    riskReasons: reasons,
    note: null,
    operator: null,
    createdAt: now,
    updatedAt: now,
  };
  store.payoutLedger.byTaskId[taskId] = item;
  store.payoutLedger.list.push(item);
  return item;
}

function updateStatus(task, status, options) {
  if (!featureFlags.ENABLE_PAYOUT_LEDGER) return null;
  ensureLedger();
  const item = store.payoutLedger.byTaskId[String(task.taskId)] || upsertFromTask(task);
  if (!item) return null;
  item.payoutStatus = status;
  if (options && options.note !== undefined) item.note = options.note;
  if (options && options.operatorKey) item.operator = maskAdminKey(options.operatorKey);
  item.updatedAt = new Date().toISOString();
  return item;
}

function getLedgerSummary(taskId) {
  if (!featureFlags.ENABLE_PAYOUT_LEDGER) return null;
  ensureLedger();
  return store.payoutLedger.byTaskId[String(taskId)] || null;
}

module.exports = {
  upsertFromTask,
  updateStatus,
  getLedgerSummary,
  computeRisk,
};
