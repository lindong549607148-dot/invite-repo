/**
 * 风控中间件：解析 ip/deviceId，在 bind-helper / bind-order 路由内调用 guard 并处理 action
 */
const riskGuard = require('./riskGuard');
const riskConfig = require('./riskConfig');
const inviteService = require('../services/inviteService');
const { structuredLog } = require('../logger');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function getDeviceId(req) {
  const id = req.headers['x-device-id'];
  return id && typeof id === 'string' ? id.trim() : 'unknown';
}

/**
 * 在 bind-helper 业务逻辑前调用：校验风控，若 intercept 则 res 结束并返回 4501
 * 若 review 则继续但返回 needReview: true + helperStatus: 'PENDING_REVIEW'
 * 在路由里：先 runBindHelperGuard(req, res, (riskResult) => { ... 执行业务，若 riskResult.needReview 则 bindHelper(..., { helperStatus: 'PENDING_REVIEW' }); 并 record* })
 */
function runBindHelperGuard(req, res, next, handler) {
  const helperUserId = req.user.userId;
  if (!riskConfig.shouldApplyToUser(helperUserId)) {
    return handler(null);
  }
  const ip = getClientIp(req);
  const deviceId = getDeviceId(req);
  const taskNo = req.body.taskNo;
  const task = inviteService.getTaskByTaskNo(taskNo);
  if (!task) return handler(null);
  const inviterUserId = task.userId;

  const result = riskGuard.checkBindHelper({ inviterUserId, helperUserId, ip, deviceId, taskNo });

  if (result.ok) {
    return handler(null);
  }
  structuredLog('[risk]', {
    taskId: task.taskId,
    userId: helperUserId,
    rule: result.msg,
    action: result.action,
  });
  if (result.action === 'intercept') {
    return res.status(400).json({
      code: result.code,
      msg: result.msg,
      detail: result.detail,
    });
  }
  if (result.action === 'log') {
    return handler(null);
  }
  if (result.action === 'review') {
    return handler({ needReview: true, ...result });
  }
  return handler(null);
}

/**
 * 在 bind-order 业务逻辑前调用
 */
function runBindOrderGuard(req, res, next, handler) {
  const helperUserId = req.user.userId;
  if (!riskConfig.shouldApplyToUser(helperUserId)) {
    return handler(null);
  }
  const ip = getClientIp(req);
  const deviceId = getDeviceId(req);
  const taskNo = req.body.taskNo;
  const orderId = req.body.orderId;
  const orderService = require('../services/orderService');
  const order = orderService.getOrder(orderId);
  const task = inviteService.getTaskByTaskNo(taskNo);
  if (!task) return handler(null);
  const inviterUserId = task.userId;

  const result = riskGuard.checkBindOrder({ inviterUserId, helperUserId, ip, deviceId, taskNo, order });

  if (result.ok) {
    return handler(null);
  }
  structuredLog('[risk]', {
    taskId: task.taskId,
    userId: helperUserId,
    rule: result.msg,
    action: result.action,
  });
  if (result.action === 'intercept') {
    return res.status(400).json({
      code: result.code,
      msg: result.msg,
      detail: result.detail,
    });
  }
  if (result.action === 'log') {
    return handler(null);
  }
  if (result.action === 'review') {
    return handler({ needReview: true, ...result });
  }
  return handler(null);
}

function recordBindHelper(req, inviterUserId, helperUserId) {
  const ip = getClientIp(req);
  const deviceId = getDeviceId(req);
  riskGuard.recordIpHelper(ip);
  riskGuard.recordDeviceHelper(deviceId);
  riskGuard.recordHelperInviter(helperUserId, inviterUserId);
}

function recordBindOrder(order) {
  if (order && order.addressHash) riskGuard.recordAddressHelper(order.addressHash);
}

module.exports = {
  getClientIp,
  getDeviceId,
  runBindHelperGuard,
  runBindOrderGuard,
  recordBindHelper,
  recordBindOrder,
};
