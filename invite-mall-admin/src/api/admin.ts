import { get, post } from './request'

/** 待审核任务项（与后端 store.tasks 中 PENDING_PAYOUT 一致） */
export interface RefundTaskItem {
  taskId: string
  taskNo: string
  userId: string
  orderId: string
  status: string
  requiredHelpers?: number
  createdAt?: string
  qualifiedAt?: string
  payoutAt?: string
}

/** GET /api/admin/refund/list 返回数组 */
export function refundList() {
  return get<RefundTaskItem[]>('/admin/refund/list')
}

export function refundApprove(taskId: string, note?: string) {
  return post<{ taskId: string; status: string }>('/admin/refund/approve', { taskId, note })
}

export function refundReject(taskId: string, note?: string) {
  return post<{ taskId: string; status: string }>('/admin/refund/reject', { taskId, note })
}
