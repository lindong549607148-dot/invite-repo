const express = require('express');
const router = express.Router();
const { ok, fail, BAD_REQUEST } = require('../utils/resp');
const inviteService = require('../services/inviteService');
const taskView = require('../services/taskView');
const payoutLedgerService = require('../services/payoutLedgerService');
const featureFlags = require('../config/featureFlags');
const orderService = require('../services/orderService');
const { store } = require('../store/memory');
const funnelService = require('../services/funnelService');

function hasRefundListQuery(query) {
  const keys = ['riskLevel', 'payoutStatus', 'status', 'q', 'page', 'pageSize', 'sort'];
  return keys.some((k) => query[k] !== undefined);
}

function parsePage(value, fallback) {
  const parsed = parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parsePageSize(value, fallback) {
  const parsed = parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 10) return 10;
  if (parsed > 100) return 100;
  return parsed;
}

function enrichRefundTask(task) {
  const order = task.orderId ? orderService.getOrder(task.orderId) : null;
  const amount = order ? order.amount : null;
  const riskLevel = task.riskLevel || payoutLedgerService.computeRisk(task).level || null;
  const ledger = payoutLedgerService.getLedgerSummary(task.taskId);
  return {
    ...task,
    amount,
    riskLevel,
    payoutStatus: ledger ? ledger.payoutStatus : null,
    qualifiedAt: (ledger && ledger.qualifiedAt) || task.qualifiedAt || null,
    payoutAt: (ledger && ledger.payoutAt) || task.payoutAt || null,
    createdAt: task.createdAt,
  };
}

function requireBody(req, res, keys, next) {
  const missing = keys.filter((k) => req.body[k] === undefined || req.body[k] === '');
  if (missing.length) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  next();
}

router.get('/refund/list', (req, res, next) => {
  try {
    const queryEnabled = hasRefundListQuery(req.query || {});
    const baseList = queryEnabled ? store.tasks : inviteService.getPendingPayoutTasks();
    if (!queryEnabled) {
      return res.json(ok(baseList.map(enrichRefundTask)));
    }

    const riskLevel = String(req.query.riskLevel || 'ALL').toUpperCase();
    const payoutStatus = String(req.query.payoutStatus || 'ALL').toUpperCase();
    const status = String(req.query.status || 'ALL').toUpperCase();
    const q = String(req.query.q || '').trim();
    const sort = String(req.query.sort || 'createdAt_desc');
    const page = parsePage(req.query.page, 1);
    const pageSize = parsePageSize(req.query.pageSize, 20);

    let filtered = baseList.filter((task) => {
      if (riskLevel !== 'ALL') {
        const level = String((task.riskLevel || payoutLedgerService.computeRisk(task).level) || '').toUpperCase();
        if (level !== riskLevel) return false;
      }
      if (payoutStatus !== 'ALL') {
        const ledger = payoutLedgerService.getLedgerSummary(task.taskId);
        const statusVal = String((ledger && ledger.payoutStatus) || '').toUpperCase();
        if (statusVal !== payoutStatus) return false;
      }
      if (status !== 'ALL' && String(task.status || '').toUpperCase() !== status) return false;
      if (q) {
        const taskNo = String(task.taskNo || '');
        const userId = String(task.userId || '');
        if (!taskNo.includes(q) && userId !== q) return false;
      }
      return true;
    });

    filtered = filtered.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (sort === 'createdAt_asc') return ta - tb;
      return tb - ta;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map(enrichRefundTask);
    return res.json(ok({ items, page, pageSize, total }));
  } catch (err) {
    next(err);
  }
});

router.get('/refund/meta', (req, res, next) => {
  try {
    const payoutStatuses = new Set();
    const taskStatuses = new Set();
    store.tasks.forEach((t) => {
      if (t && t.status) taskStatuses.add(t.status);
      const ledger = payoutLedgerService.getLedgerSummary(t.taskId);
      if (ledger && ledger.payoutStatus) payoutStatuses.add(ledger.payoutStatus);
    });
    res.json(
      ok({
        payoutStatuses: Array.from(payoutStatuses).sort(),
        taskStatuses: Array.from(taskStatuses).sort(),
        riskLevels: ['LOW', 'MEDIUM', 'HIGH'],
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/metrics/funnel', (req, res, next) => {
  try {
    res.json(ok(funnelService.getSummary()));
  } catch (err) {
    next(err);
  }
});

router.get('/tasks/detail', (req, res, next) => {
  try {
    const taskId = req.query.taskId;
    if (!taskId) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    const detail = taskView.buildTaskDetail(taskId);
    if (!detail) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    res.json(ok(detail));
  } catch (err) {
    next(err);
  }
});

router.post('/refund/approve', (req, res, next) => {
  try {
    requireBody(req, res, ['taskId'], () => {
      const { taskId, note } = req.body;
      const rawTask = require('../store/memory').store.tasks.find((t) => t.taskId === taskId);
      if (!rawTask) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      if (rawTask.status !== 'PENDING_PAYOUT') {
        return res.json(ok({ alreadyHandled: true, status: rawTask.status }));
      }
      if (featureFlags.ENABLE_RISK_BLOCKING) {
        const risk = payoutLedgerService.computeRisk(rawTask);
        if (risk.level === 'HIGH') {
          return res.status(403).json({ code: 4033, msg: 'risk_blocked' });
        }
      }
      const task = inviteService.approveTask(taskId, note);
      if (!task) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      payoutLedgerService.updateStatus(task, 'APPROVED', { note, operatorKey: req.headers['x-admin-key'] });
      res.json(ok({ taskId: task.taskId, status: task.status }));
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refund/reject', (req, res, next) => {
  try {
    requireBody(req, res, ['taskId'], () => {
      const { taskId, note } = req.body;
      const rawTask = require('../store/memory').store.tasks.find((t) => t.taskId === taskId);
      if (!rawTask) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      if (rawTask.status !== 'PENDING_PAYOUT') {
        return res.json(ok({ alreadyHandled: true, status: rawTask.status }));
      }
      const task = inviteService.rejectTask(taskId, note);
      if (!task) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      payoutLedgerService.updateStatus(task, 'REJECTED', { note, operatorKey: req.headers['x-admin-key'] });
      res.json(ok({ taskId: task.taskId, status: task.status }));
    });
  } catch (err) {
    next(err);
  }
});

router.get('/risk/review/list', (req, res, next) => {
  try {
    const list = inviteService.getTasksWithPendingReviewHelpers();
    res.json(ok(list));
  } catch (err) {
    next(err);
  }
});

router.post('/risk/review/approve', (req, res, next) => {
  try {
    requireBody(req, res, ['taskId', 'helperUserId'], () => {
      const { taskId, helperUserId } = req.body;
      const help = inviteService.approveRiskHelper(taskId, helperUserId);
      if (!help) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      res.json(ok({ taskId, helperUserId, helperStatus: help.helperStatus }));
    });
  } catch (err) {
    next(err);
  }
});

router.post('/risk/review/reject', (req, res, next) => {
  try {
    requireBody(req, res, ['taskId', 'helperUserId'], () => {
      const { taskId, helperUserId } = req.body;
      const help = inviteService.rejectRiskHelper(taskId, helperUserId);
      if (!help) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      res.json(ok({ taskId, helperUserId, helperStatus: help.helperStatus }));
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
