const express = require('express');
const router = express.Router();
const { ok } = require('../utils/resp');
const { store, getTodayDate } = require('../store/memory');

/**
 * 从内存 store 统计仪表盘数据
 */
function getStats() {
  const today = getTodayDate();

  const todayUsers = store.users.filter((u) => (u.createdAt || '').slice(0, 10) === today).length;
  const totalUsers = store.users.length;

  const todayOrders = store.orders.filter((o) => (o.createdAt || '').slice(0, 10) === today).length;
  const totalOrders = store.orders.length;

  const todayInvites = store.helps.filter((h) => (h.createdAt || '').slice(0, 10) === today).length;
  const totalInvites = store.helps.length;

  const pendingTasks = store.tasks.filter((t) => t.status === 'PENDING').length;

  return {
    todayUsers,
    totalUsers,
    todayOrders,
    totalOrders,
    todayInvites,
    totalInvites,
    pendingTasks,
  };
}

router.get('/stats', (req, res, next) => {
  const data = getStats();
  res.json(ok(data));
});

module.exports = router;
