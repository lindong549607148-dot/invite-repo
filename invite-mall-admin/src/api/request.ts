import axios, { type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
const adminKey = import.meta.env.VITE_ADMIN_KEY || 'dev-admin-key'

export const request = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

request.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (adminKey) {
      config.headers['x-admin-key'] = adminKey
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data?.code !== undefined && data.code !== 0) {
      return Promise.reject(new Error(data.msg || data.message || '请求失败'))
    }
    return response.data?.data !== undefined ? response.data.data : response.data
  },
  (error) => {
    const status = error.response?.status
    const data = error.response?.data
    const msg = data?.msg || data?.message || (status === 401 ? '未授权' : status === 403 ? '无权限' : '请求失败')
    if (status === 401 || status === 403) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(new Error(msg))
  }
)

export function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request.get(url, config) as Promise<T>
}

export function post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request.post(url, data, config) as Promise<T>
}

export function put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request.put(url, data, config) as Promise<T>
}

export function del<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request.delete(url, config) as Promise<T>
}

export default request
