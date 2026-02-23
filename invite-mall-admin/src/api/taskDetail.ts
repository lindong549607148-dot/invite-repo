import { get } from './request'

/** 与后端 task-detail 文档一致 */
export interface TaskDetailHelper {
  helperUserId: string
  nickname: string
  avatar: string
  status: string
  boundAt: number | null
  orderId: string | null
  orderStatus: string | null
}

export interface TaskDetailLedger {
  payoutStatus: string
  qualifiedAt: string | null
  payoutAt: string | null
}

export interface TaskDetail {
  taskId: string
  taskNo: string
  status: string
  progress: number
  required_helpers: number
  qualified_at: number | string | null
  payout_at: number | string | null
  countdown_seconds: number
  helpers: TaskDetailHelper[]
  risk_flags: {
    enabled: boolean
    has_pending_review: boolean
    reasons: string[]
  }
  /** 后台详情返回 */
  ledger?: TaskDetailLedger | null
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
  riskFlags?: { reasons: string[] }
}

/** 后台用：GET /api/admin/tasks/detail?taskId= （x-admin-key） */
export function taskDetail(taskId: string) {
  return get<TaskDetail>('/admin/tasks/detail', { params: { taskId } })
}
