import { get, post } from './request'

/** 待审核任务项（GET /api/admin/refund/list 返回，与后端 store.tasks 中 PENDING_PAYOUT 一致） */
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
  amount?: number
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
  payoutStatus?: string
}

export interface RefundListQuery {
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ALL'
  payoutStatus?: string
  status?: string
  q?: string
  page?: number
  pageSize?: number
  sort?: 'createdAt_desc' | 'createdAt_asc'
}

export interface RefundListResponse {
  items: RefundTaskItem[]
  page: number
  pageSize: number
  total: number
}

/** GET /api/admin/refund/list */
export async function refundList(query?: RefundListQuery): Promise<RefundListResponse> {
  const data = await get<RefundTaskItem[] | RefundListResponse>('/admin/refund/list', { params: query })
  if (Array.isArray(data)) {
    return { items: data, page: 1, pageSize: data.length, total: data.length }
  }
  return {
    items: Array.isArray(data.items) ? data.items : [],
    page: data.page || 1,
    pageSize: data.pageSize || 20,
    total: data.total || 0,
  }
}

export function refundApprove(taskId: string, note?: string) {
  return post<{ taskId: string; status: string }>('/admin/refund/approve', { taskId, note })
}

export function refundReject(taskId: string, note?: string) {
  return post<{ taskId: string; status: string }>('/admin/refund/reject', { taskId, note })
}

export interface RefundMetaResponse {
  payoutStatuses: string[]
  taskStatuses: string[]
  riskLevels: Array<'LOW' | 'MEDIUM' | 'HIGH'>
}

export function refundMeta() {
  return get<RefundMetaResponse>('/admin/refund/meta')
}
