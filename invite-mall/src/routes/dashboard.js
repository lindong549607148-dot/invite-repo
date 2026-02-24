const express = require('express');
const router = express.Router();
const { ok } = require('../utils/resp');
const { getDashboardStats } = require('../mock/adminMock');

router.get('/stats', (req, res, next) => {
  try {
    const data = getDashboardStats();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
