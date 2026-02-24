import { get } from './request'

export interface DashboardStats {
  todayUsers: number
  totalUsers: number
  todayOrders: number
  totalOrders: number
  todayInvites: number
  totalInvites: number
  activeTasks: number
}

export function fetchDashboardStats() {
  return get<DashboardStats>('/admin/dashboard/stats')
}
