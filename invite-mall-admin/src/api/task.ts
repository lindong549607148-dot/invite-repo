import { get, post } from './request'

export interface TaskItem {
  id: string
  title: string
  type: 'invite' | 'share' | 'order'
  reward: string
  target: number
  completed: number
  status: 'draft' | 'active' | 'ended'
  startTime: string
  endTime: string
  createdAt: string
}

export interface TaskListRes {
  list: TaskItem[]
  total: number
}

export function fetchTaskList(params: { page?: number; pageSize?: number; status?: string }) {
  return get<TaskListRes>('/admin/tasks', { params })
}

export function updateTaskStatus(id: string, status: string) {
  return post(`/admin/tasks/${id}/status`, { status })
}
