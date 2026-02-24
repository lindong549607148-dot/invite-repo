import { get } from './request'

export interface OrderItem {
  id: string
  orderNo: string
  userId: string
  userName: string
  amount: number
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
  productName: string
  createdAt: string
}

export interface OrderListRes {
  list: OrderItem[]
  total: number
}

export function fetchOrderList(params: { page?: number; pageSize?: number; status?: string }) {
  return get<OrderListRes>('/admin/orders', { params })
}
