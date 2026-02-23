import type { UserItem } from '@/api/user'
import type { TaskItem } from '@/api/task'
import type { OrderItem } from '@/api/order'
import type { DashboardStats } from '@/api/dashboard'
import type { RefundTaskItem } from '@/api/admin'
import type { TaskDetail } from '@/api/taskDetail'

export const mockUsers: UserItem[] = [
  { id: '1', nickname: '小红薯', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1', phone: '138****8001', inviteCount: 128, orderCount: 12, status: 'normal', createdAt: '2025-02-15 10:00:00' },
  { id: '2', nickname: '种草机', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2', phone: '139****8002', inviteCount: 86, orderCount: 8, status: 'normal', createdAt: '2025-02-16 11:20:00' },
  { id: '3', nickname: '买买买', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3', phone: '136****8003', inviteCount: 45, orderCount: 23, status: 'normal', createdAt: '2025-02-17 09:15:00' },
  { id: '4', nickname: '分享达人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4', phone: '137****8004', inviteCount: 256, orderCount: 5, status: 'disabled', createdAt: '2025-02-18 14:30:00' },
  { id: '5', nickname: '新用户', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5', phone: '135****8005', inviteCount: 0, orderCount: 1, status: 'normal', createdAt: '2025-02-20 16:00:00' },
]

export const mockTasks: TaskItem[] = [
  { id: '1', title: '邀请3人得优惠券', type: 'invite', reward: '20元券', target: 3, completed: 1280, status: 'active', startTime: '2025-02-01 00:00:00', endTime: '2025-02-28 23:59:59', createdAt: '2025-01-28 10:00:00' },
  { id: '2', title: '分享商品领红包', type: 'share', reward: '5元红包', target: 1, completed: 3560, status: 'active', startTime: '2025-02-10 00:00:00', endTime: '2025-03-10 23:59:59', createdAt: '2025-02-09 14:00:00' },
  { id: '3', title: '首单立减', type: 'order', reward: '满100减30', target: 1, completed: 892, status: 'active', startTime: '2025-02-15 00:00:00', endTime: '2025-02-25 23:59:59', createdAt: '2025-02-14 09:00:00' },
  { id: '4', title: '春节邀请活动', type: 'invite', reward: '50元礼包', target: 5, completed: 420, status: 'ended', startTime: '2025-01-20 00:00:00', endTime: '2025-02-05 23:59:59', createdAt: '2025-01-15 10:00:00' },
]

export const mockOrders: OrderItem[] = [
  { id: '1', orderNo: 'ORD202502200001', userId: '1', userName: '小红薯', amount: 199, status: 'completed', productName: '美妆礼盒', createdAt: '2025-02-20 10:30:00' },
  { id: '2', orderNo: 'ORD202502200002', userId: '2', userName: '种草机', amount: 89, status: 'shipped', productName: '护肤套装', createdAt: '2025-02-20 11:15:00' },
  { id: '3', orderNo: 'ORD202502200003', userId: '3', userName: '买买买', amount: 299, status: 'paid', productName: '精华液', createdAt: '2025-02-20 12:00:00' },
  { id: '4', orderNo: 'ORD202502190004', userId: '1', userName: '小红薯', amount: 59, status: 'completed', productName: '面膜', createdAt: '2025-02-19 15:20:00' },
  { id: '5', orderNo: 'ORD202502190005', userId: '4', userName: '分享达人', amount: 158, status: 'cancelled', productName: '口红', createdAt: '2025-02-19 16:45:00' },
]

export const mockDashboardStats: DashboardStats = {
  todayUsers: 128,
  totalUsers: 12580,
  todayOrders: 56,
  totalOrders: 3892,
  todayInvites: 342,
  totalInvites: 28900,
  activeTasks: 3,
}

export const mockRefundList: RefundTaskItem[] = [
  { taskId: '1', taskNo: 'TMLVYQ63Ohmhm', userId: '1', orderId: 'ord_001', status: 'PENDING_PAYOUT', requiredHelpers: 2, createdAt: '2025-02-15T10:00:00.000Z', qualifiedAt: '2025-02-18T10:00:00.000Z', payoutAt: '2025-02-20T10:00:00.000Z' },
  { taskId: '2', taskNo: 'TMLVYQ64Ohmhn', userId: '2', orderId: 'ord_002', status: 'PENDING_PAYOUT', requiredHelpers: 2, createdAt: '2025-02-16T11:00:00.000Z', qualifiedAt: '2025-02-19T11:00:00.000Z', payoutAt: '2025-02-21T11:00:00.000Z' },
]

export const mockTaskDetail: TaskDetail = {
  taskId: '1',
  taskNo: 'TMLVYQ63Ohmhm',
  status: 'PENDING_PAYOUT',
  progress: 2,
  required_helpers: 2,
  qualified_at: 1739123456789,
  payout_at: 1739210000000,
  countdown_seconds: 0,
  helpers: [
    { helperUserId: '2', nickname: '用户2', avatar: 'https://cdn.example.com/default-avatar.png', status: 'RECEIVED', boundAt: 1739123400000, orderId: 'ord_001', orderStatus: 'RECEIVED' },
    { helperUserId: '3', nickname: '小明', avatar: 'https://cdn.example.com/avatar3.png', status: 'RECEIVED', boundAt: 1739123410000, orderId: 'ord_002', orderStatus: 'RECEIVED' },
  ],
  risk_flags: { enabled: false, has_pending_review: false, reasons: [] },
}
