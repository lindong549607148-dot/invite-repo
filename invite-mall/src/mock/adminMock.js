const { store } = require('../store/memory');

const mockUsers = [
  { id: '1', nickname: '小红薯', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1', phone: '138****8001', inviteCount: 128, orderCount: 12, status: 'normal', createdAt: '2025-02-15 10:00:00' },
  { id: '2', nickname: '种草机', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2', phone: '139****8002', inviteCount: 86, orderCount: 8, status: 'normal', createdAt: '2025-02-16 11:20:00' },
  { id: '3', nickname: '买买买', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3', phone: '136****8003', inviteCount: 45, orderCount: 23, status: 'normal', createdAt: '2025-02-17 09:15:00' },
  { id: '4', nickname: '分享达人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4', phone: '137****8004', inviteCount: 256, orderCount: 5, status: 'disabled', createdAt: '2025-02-18 14:30:00' },
  { id: '5', nickname: '新用户', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5', phone: '135****8005', inviteCount: 0, orderCount: 1, status: 'normal', createdAt: '2025-02-20 16:00:00' },
];

const mockTasks = [
  { id: '1', title: '邀请3人得优惠券', type: 'invite', reward: '20元券', target: 3, completed: 1280, status: 'active', startTime: '2025-02-01 00:00:00', endTime: '2025-02-28 23:59:59', createdAt: '2025-01-28 10:00:00' },
  { id: '2', title: '分享商品领红包', type: 'share', reward: '5元红包', target: 1, completed: 3560, status: 'active', startTime: '2025-02-10 00:00:00', endTime: '2025-03-10 23:59:59', createdAt: '2025-02-09 14:00:00' },
  { id: '3', title: '首单立减', type: 'order', reward: '满100减30', target: 1, completed: 892, status: 'active', startTime: '2025-02-15 00:00:00', endTime: '2025-02-25 23:59:59', createdAt: '2025-02-14 09:00:00' },
  { id: '4', title: '春节邀请活动', type: 'invite', reward: '50元礼包', target: 5, completed: 420, status: 'ended', startTime: '2025-01-20 00:00:00', endTime: '2025-02-05 23:59:59', createdAt: '2025-01-15 10:00:00' },
];

const mockOrders = [
  { id: '1', orderNo: 'ORD202502200001', userId: '1', userName: '小红薯', amount: 199, status: 'completed', productName: '美妆礼盒', createdAt: '2025-02-20 10:30:00' },
  { id: '2', orderNo: 'ORD202502200002', userId: '2', userName: '种草机', amount: 89, status: 'shipped', productName: '护肤套装', createdAt: '2025-02-20 11:15:00' },
  { id: '3', orderNo: 'ORD202502200003', userId: '3', userName: '买买买', amount: 299, status: 'paid', productName: '精华液', createdAt: '2025-02-20 12:00:00' },
  { id: '4', orderNo: 'ORD202502190004', userId: '1', userName: '小红薯', amount: 59, status: 'completed', productName: '面膜', createdAt: '2025-02-19 15:20:00' },
  { id: '5', orderNo: 'ORD202502190005', userId: '4', userName: '分享达人', amount: 158, status: 'cancelled', productName: '口红', createdAt: '2025-02-19 16:45:00' },
];

const mockDashboardStats = {
  todayUsers: 128,
  totalUsers: 12580,
  todayOrders: 56,
  totalOrders: 3892,
  todayInvites: 342,
  totalInvites: 28900,
  activeTasks: 3,
};

function shouldUseMock() {
  if (process.env.MOCK_ADMIN === '1') return true;
  const hasUsers = store.users.length > 0;
  const hasOrders = store.orders.length > 0;
  const hasTasks = store.tasks.length > 0;
  return !(hasUsers || hasOrders || hasTasks);
}

function paginate(list, page, pageSize) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  const start = (safePage - 1) * safeSize;
  return { list: list.slice(start, start + safeSize), total: list.length, page: safePage, pageSize: safeSize };
}

function mapUsersFromStore() {
  return store.users.map((u) => {
    const userId = String(u.userId);
    const inviteCount = store.helps.filter((h) => String(h.helperUserId) === userId).length;
    const orderCount = store.orders.filter((o) => String(o.userId) === userId).length;
    return {
      id: userId,
      nickname: u.userName || `用户${userId}`,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + userId,
      phone: '138****' + String(8000 + Number(userId) % 1000).padStart(4, '0'),
      inviteCount,
      orderCount,
      status: 'normal',
      createdAt: u.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
  });
}

function mapTasksFromStore() {
  return store.tasks.map((t) => {
    const helps = store.helps.filter((h) => h.taskId === t.taskId && h.status === 'VALID');
    return {
      id: String(t.taskId),
      title: `邀请任务 ${t.taskNo || t.taskId}`,
      type: 'invite',
      reward: '免单',
      target: Number(t.requiredHelpers || 2),
      completed: helps.length,
      status: t.status === 'REVOKED' || t.status === 'PAID_OUT' ? 'ended' : 'active',
      startTime: t.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' '),
      endTime: t.payoutAt || '',
      createdAt: t.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
  });
}

function mapOrdersFromStore() {
  return store.orders.map((o) => ({
    id: String(o.orderId),
    orderNo: String(o.orderId),
    userId: String(o.userId),
    userName: (store.users.find((u) => String(u.userId) === String(o.userId)) || {}).userName || '用户',
    amount: Number(o.amount || 0),
    status: (o.status || 'pending').toLowerCase(),
    productName: o.productName || '商品',
    createdAt: o.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' '),
  }));
}

function getUsersData() {
  return shouldUseMock() ? mockUsers : mapUsersFromStore();
}

function getTasksData() {
  return shouldUseMock() ? mockTasks : mapTasksFromStore();
}

function getOrdersData() {
  return shouldUseMock() ? mockOrders : mapOrdersFromStore();
}

function getDashboardStats() {
  if (shouldUseMock()) return mockDashboardStats;
  const today = new Date().toISOString().slice(0, 10);
  const todayUsers = store.users.filter((u) => (u.createdAt || '').slice(0, 10) === today).length;
  const totalUsers = store.users.length;
  const todayOrders = store.orders.filter((o) => (o.createdAt || '').slice(0, 10) === today).length;
  const totalOrders = store.orders.length;
  const todayInvites = store.helps.filter((h) => (h.createdAt || '').slice(0, 10) === today).length;
  const totalInvites = store.helps.length;
  const activeTasks = store.tasks.filter((t) => ['PENDING', 'QUALIFIED', 'PENDING_PAYOUT'].includes(t.status)).length;
  return { todayUsers, totalUsers, todayOrders, totalOrders, todayInvites, totalInvites, activeTasks };
}

module.exports = {
  shouldUseMock,
  paginate,
  getUsersData,
  getTasksData,
  getOrdersData,
  getDashboardStats,
};
