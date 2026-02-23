const express = require('express');
const router = express.Router();
const { ok, fail, BAD_REQUEST } = require('../utils/resp');
const inviteService = require('../services/inviteService');
const taskView = require('../services/taskView');
const payoutLedgerService = require('../services/payoutLedgerService');
const featureFlags = require('../config/featureFlags');
const orderService = require('../services/orderService');

function requireBody(req, res, keys, next) {
  const missing = keys.filter((k) => req.body[k] === undefined || req.body[k] === '');
  if (missing.length) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  next();
}

router.get('/refund/list', (req, res, next) => {
  const list = inviteService.getPendingPayoutTasks();
  const enriched = list.map((task) => {
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
  });
  res.json(ok(enriched));
});

router.get('/tasks/detail', (req, res, next) => {
  const taskId = req.query.taskId;
  if (!taskId) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  const detail = taskView.buildTaskDetail(taskId);
  if (!detail) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  res.json(ok(detail));
});

router.post('/refund/approve', (req, res, next) => {
  requireBody(req, res, ['taskId'], () => {
    const { taskId, note } = req.body;
    const rawTask = require('../store/memory').store.tasks.find((t) => t.taskId === taskId);
    if (rawTask && featureFlags.ENABLE_RISK_BLOCKING) {
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
});

router.post('/refund/reject', (req, res, next) => {
  requireBody(req, res, ['taskId'], () => {
    const { taskId, note } = req.body;
    const task = inviteService.rejectTask(taskId, note);
    if (!task) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    payoutLedgerService.updateStatus(task, 'REJECTED', { note, operatorKey: req.headers['x-admin-key'] });
    res.json(ok({ taskId: task.taskId, status: task.status }));
  });
});

router.get('/risk/review/list', (req, res, next) => {
  const list = inviteService.getTasksWithPendingReviewHelpers();
  res.json(ok(list));
});

router.post('/risk/review/approve', (req, res, next) => {
  requireBody(req, res, ['taskId', 'helperUserId'], () => {
    const { taskId, helperUserId } = req.body;
    const help = inviteService.approveRiskHelper(taskId, helperUserId);
    if (!help) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    res.json(ok({ taskId, helperUserId, helperStatus: help.helperStatus }));
  });
});

router.post('/risk/review/reject', (req, res, next) => {
  requireBody(req, res, ['taskId', 'helperUserId'], () => {
    const { taskId, helperUserId } = req.body;
    const help = inviteService.rejectRiskHelper(taskId, helperUserId);
    if (!help) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    res.json(ok({ taskId, helperUserId, helperStatus: help.helperStatus }));
  });
});

module.exports = router;
