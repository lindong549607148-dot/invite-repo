import { get, post } from './request'

export interface UserItem {
  id: string
  nickname: string
  avatar: string
  phone: string
  inviteCount: number
  orderCount: number
  status: 'normal' | 'disabled'
  createdAt: string
}

export interface UserListRes {
  list: UserItem[]
  total: number
}

export function fetchUserList(params: { page?: number; pageSize?: number; keyword?: string }) {
  return get<UserListRes>('/admin/users', { params })
}

export function updateUserStatus(id: string, status: 'normal' | 'disabled') {
  return post(`/admin/users/${id}/status`, { status })
}
