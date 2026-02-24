import { post } from './request'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginRes {
  token: string
  user: { name: string; avatar?: string }
}

export function login(data: LoginParams) {
  return post<LoginRes>('/admin/auth/login', data)
}
