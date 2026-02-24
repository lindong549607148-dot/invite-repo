const express = require('express');
const router = express.Router();
const { ok, fail, BAD_REQUEST, FORBIDDEN } = require('../utils/resp');
const { store } = require('../store/memory');
const inviteService = require('../services/inviteService');
const taskView = require('../services/taskView');
const { runBindHelperGuard, runBindOrderGuard, recordBindHelper, recordBindOrder, getDeviceId } = require('../risk/riskMiddleware');
const { HELPER_STATUS } = require('../services/inviteService');
const riskSignals = require('../risk/riskSignals');
const featureFlags = require('../config/featureFlags');

function computeRiskLevel(task) {
  const marks = task && Array.isArray(task.riskMarks) ? task.riskMarks : [];
  const rules = Array.from(new Set(marks.map((m) => m.rule)));
  if (rules.length >= 2) return 'HIGH';
  if (rules.length === 1) return 'MEDIUM';
  return 'LOW';
}

function requireBody(req, res, keys, next) {
  const missing = keys.filter((k) => req.body[k] === undefined || req.body[k] === '');
  if (missing.length) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  next();
}

router.post('/start', (req, res, next) => {
  try {
    requireBody(req, res, ['orderId'], () => {
      const userId = req.user.userId;
      const orderId = req.body.orderId;
      const result = inviteService.startTask(userId, orderId);
      if (result.err) {
        return res.status(400).json(fail(BAD_REQUEST, result.err));
      }
      res.json(ok({ taskId: result.task.taskId, taskNo: result.task.taskNo }));
    });
  } catch (err) {
    next(err);
  }
});

router.post('/bind-helper', (req, res, next) => {
  try {
    requireBody(req, res, ['taskNo'], () => {
    const taskNo = req.body.taskNo;
    const helperUserId = req.user.userId;
    const task = inviteService.getTaskByTaskNo(taskNo);
    if (task && featureFlags.ENABLE_RISK_BLOCKING && computeRiskLevel(task) === 'HIGH') {
      console.error('[risk][block]', { taskId: task.taskId, userId: task.userId, riskReasons: (task.riskMarks || []).map((m) => m.rule) });
      return res.status(403).json({ code: 4033, msg: 'risk_blocked' });
    }
    runBindHelperGuard(req, res, next, (riskResult) => {
      if (res.headersSent) return;
      const options = riskResult && riskResult.needReview ? { helperStatus: HELPER_STATUS.PENDING_REVIEW } : undefined;
      const result = inviteService.bindHelper(taskNo, helperUserId, options);
      if (result.err) {
        return res.status(400).json(fail(BAD_REQUEST, result.err));
      }
      const task = inviteService.getTaskByTaskNo(taskNo);
      if (task) {
        recordBindHelper(req, task.userId, helperUserId);
        const deviceId = getDeviceId(req);
        const hit = riskSignals.checkDeviceLimit(deviceId);
        if (hit) {
          riskSignals.markTaskRisk(task, 'device', hit);
          console.warn('[risk][device] hit', { taskId: task.taskId, deviceId, count: hit.count, max: hit.max });
        }
        const helperUser = store.users.find((u) => u.userId === helperUserId);
        if (helperUser && helperUser.riskFlags && helperUser.riskFlags.phone_limit) {
          riskSignals.markTaskRisk(task, 'phone', { rule: 'phone' });
          console.warn('[risk][phone] hit', { taskId: task.taskId, helperUserId });
        }
      }
      res.json(ok({ helpId: result.help.helpId, helperStatus: result.help.helperStatus }));
    });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/bind-order', (req, res, next) => {
  try {
    requireBody(req, res, ['taskNo', 'orderId'], () => {
    const { taskNo, orderId } = req.body;
    const helperUserId = req.user.userId;
    const task = inviteService.getTaskByTaskNo(taskNo);
    if (task && featureFlags.ENABLE_RISK_BLOCKING && computeRiskLevel(task) === 'HIGH') {
      console.error('[risk][block]', { taskId: task.taskId, userId: task.userId, riskReasons: (task.riskMarks || []).map((m) => m.rule) });
      return res.status(403).json({ code: 4033, msg: 'risk_blocked' });
    }
    const orderService = require('../services/orderService');
    const order = orderService.getOrder(orderId);
    if (!order || order.userId !== helperUserId) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    runBindOrderGuard(req, res, next, (riskResult) => {
      if (res.headersSent) return;
      const help = inviteService.bindOrderToHelp(taskNo, helperUserId, orderId);
      if (!help) {
        return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
      }
      if (riskResult && riskResult.needReview) {
        help.helperStatus = HELPER_STATUS.PENDING_REVIEW;
      }
      recordBindOrder(order);
      const task = inviteService.getTaskByTaskNo(taskNo);
      if (task && order && order.addressHash) {
        riskSignals.recordAddressOrder(order.addressHash);
        const hit = riskSignals.checkAddressLimit(order.addressHash);
        if (hit) {
          riskSignals.markTaskRisk(task, 'address', hit);
          console.warn('[risk][address] hit', { taskId: task.taskId, addressHash: order.addressHash, count: hit.count, max: hit.max });
        }
      }
      res.json(ok({ helpId: help.helpId, helperStatus: help.helperStatus }));
    });
    });
  } catch (err) {
    next(err);
  }
});

router.get('/detail', (req, res, next) => {
  try {
    const taskId = req.query.taskId;
    if (!taskId) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    const task = store.tasks.find((t) => t.taskId === taskId);
    if (!task) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    if (task.userId !== req.user.userId) {
      return res.status(403).json(fail(FORBIDDEN, 'forbidden'));
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

router.get('/progress', (req, res, next) => {
  try {
    if (!featureFlags.ENABLE_TASK_PROGRESS_API) {
      return res.status(403).json({ code: 4030, msg: 'forbidden' });
    }
    const taskId = req.query.taskId;
    if (!taskId) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    const task = store.tasks.find((t) => t.taskId === taskId);
    if (!task) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    if (task.userId !== req.user.userId) {
      return res.status(403).json(fail(FORBIDDEN, 'forbidden'));
    }
    const helps = store.helps.filter((h) => h.taskId === task.taskId);
    const orderService = require('../services/orderService');
    const helpers = helps.map((h) => {
      const order = h.orderId ? orderService.getOrder(h.orderId) : null;
      return {
        helperUserId: h.helperUserId,
        helperOrderId: h.orderId || null,
        orderStatus: order ? order.status : 'UNBOUND',
        shippedAt: order ? order.shippedAt || null : null,
        receivedAt: order ? order.receivedAt || null : null,
      };
    });
    const validCount = helps.filter(
      (h) => h.status === 'VALID' && h.helperStatus !== HELPER_STATUS.PENDING_REVIEW && h.helperStatus !== HELPER_STATUS.REJECTED
    ).length;
    const reasons = Array.isArray(task.riskMarks) ? task.riskMarks.map((m) => m.rule) : [];
    res.json(ok({
      taskId: task.taskId,
      taskNo: task.taskNo,
      status: task.status,
      target: task.requiredHelpers,
      progress: validCount,
      helpers,
      qualifiedAt: task.qualifiedAt || null,
      payoutAt: task.payoutAt || null,
      riskLevel: computeRiskLevel(task),
      riskReasons: reasons,
    }));
  } catch (err) {
    next(err);
  }
});

router.get('/list', (req, res, next) => {
  try {
    const userId = req.user.userId;
    const list = inviteService.getTaskList(userId);
    res.json(ok(list));
  } catch (err) {
    next(err);
  }
});


module.exports = router;
