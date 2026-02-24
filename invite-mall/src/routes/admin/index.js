const express = require('express');
const router = express.Router();
const { ok, fail, UNAUTHORIZED } = require('../../utils/resp');
const adminAuth = require('../../middlewares/adminAuth');
const { paginate, getUsersData, getTasksData, getOrdersData, getDashboardStats } = require('../../mock/adminMock');
const legacyAdminRouter = require('../admin');
const adminFeatureFlagsRouter = require('../adminFeatureFlags');
const adminProductsRouter = require('../adminProducts');
const adminRiskRouter = require('../adminRisk');

router.post('/auth/login', (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();
    if (!username || !password) {
      return res.status(401).json(fail(UNAUTHORIZED, 'unauthorized'));
    }
    res.json(ok({
      token: 'mock-jwt-token-' + Date.now(),
      user: { name: username, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
    }));
  } catch (err) {
    next(err);
  }
});

router.use(adminAuth);

router.get('/dashboard/stats', (req, res, next) => {
  try {
    const data = getDashboardStats();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/users', (req, res, next) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const pageSize = parseInt(String(req.query.pageSize || '10'), 10);
    const keyword = String(req.query.keyword || '').trim();
    let list = getUsersData();
    if (keyword) {
      list = list.filter((u) => u.nickname.includes(keyword) || u.phone.includes(keyword));
    }
    const { list: pageList, total } = paginate(list, page, pageSize);
    res.json(ok({ list: pageList, total }));
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/status', (req, res, next) => {
  try {
    res.json(ok(null));
  } catch (err) {
    next(err);
  }
});

router.get('/tasks', (req, res, next) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const pageSize = parseInt(String(req.query.pageSize || '10'), 10);
    const status = String(req.query.status || '').trim();
    let list = getTasksData();
    if (status) {
      list = list.filter((t) => t.status === status);
    }
    const { list: pageList, total } = paginate(list, page, pageSize);
    res.json(ok({ list: pageList, total }));
  } catch (err) {
    next(err);
  }
});

router.post('/tasks/:id/status', (req, res, next) => {
  try {
    res.json(ok(null));
  } catch (err) {
    next(err);
  }
});

router.get('/orders', (req, res, next) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const pageSize = parseInt(String(req.query.pageSize || '10'), 10);
    const status = String(req.query.status || '').trim();
    let list = getOrdersData();
    if (status) {
      list = list.filter((o) => o.status === status);
    }
    const { list: pageList, total } = paginate(list, page, pageSize);
    res.json(ok({ list: pageList, total }));
  } catch (err) {
    next(err);
  }
});

router.use(legacyAdminRouter);
router.use('/feature-flags', adminFeatureFlagsRouter);
router.use(adminProductsRouter);
router.use('/risk', adminRiskRouter);

module.exports = router;
