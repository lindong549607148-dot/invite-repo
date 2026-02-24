import MockAdapter from 'axios-mock-adapter'
import { request } from '@/api/request'
import { mockUsers, mockTasks, mockOrders, mockDashboardStats, mockRefundList, mockTaskDetail } from './data'

export function setupMock() {
  const mock = new MockAdapter(request, { delayResponse: 200 })

  mock.onPost('/admin/auth/login').reply((config) => {
    const body = JSON.parse(config.data || '{}')
    if (body.username && body.password) {
      return [
        200,
        {
          code: 0,
          data: {
            token: 'mock-jwt-token-' + Date.now(),
            user: { name: body.username, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
          },
        },
      ]
    }
    return [401, { code: 401, message: '用户名或密码错误' }]
  })

  mock.onGet(/\/admin\/dashboard\/stats/).reply(200, { code: 0, data: mockDashboardStats })

  mock.onGet(/\/admin\/users/).reply((config) => {
    const params = config.params || {}
    const page = Number(params.page) || 1
    const pageSize = Number(params.pageSize) || 10
    const start = (page - 1) * pageSize
    const list = mockUsers.slice(start, start + pageSize)
    return [200, { code: 0, data: { list, total: mockUsers.length } }]
  })

  mock.onPost(/\/admin\/users\/\w+\/status/).reply(200, { code: 0, data: null })

  mock.onGet(/\/admin\/tasks/).reply((config) => {
    const params = config.params || {}
    const page = Number(params.page) || 1
    const pageSize = Number(params.pageSize) || 10
    const status = params.status
    let list = mockTasks
    if (status) list = mockTasks.filter((t) => t.status === status)
    const start = (page - 1) * pageSize
    const slice = list.slice(start, start + pageSize)
    return [200, { code: 0, data: { list: slice, total: list.length } }]
  })

  mock.onPost(/\/admin\/tasks\/\w+\/status/).reply(200, { code: 0, data: null })

  mock.onGet(/\/admin\/orders/).reply((config) => {
    const params = config.params || {}
    const page = Number(params.page) || 1
    const pageSize = Number(params.pageSize) || 10
    const start = (page - 1) * pageSize
    const list = mockOrders.slice(start, start + pageSize)
    return [200, { code: 0, data: { list, total: mockOrders.length } }]
  })

  mock.onGet(/\/admin\/refund\/list/).reply(200, { code: 0, data: mockRefundList })

  mock.onPost(/\/admin\/refund\/approve/).reply((config) => {
    const body = JSON.parse(config.data || '{}')
    if (body.taskId) {
      return [200, { code: 0, data: { taskId: body.taskId, status: 'PAID_OUT' } }]
    }
    return [400, { code: 4001, msg: 'bad_request' }]
  })

  mock.onPost(/\/admin\/refund\/reject/).reply((config) => {
    const body = JSON.parse(config.data || '{}')
    if (body.taskId) {
      return [200, { code: 0, data: { taskId: body.taskId, status: 'REVOKED' } }]
    }
    return [400, { code: 4001, msg: 'bad_request' }]
  })

  mock.onGet(/\/admin\/tasks\/detail/).reply((config) => {
    const taskId = config.params?.taskId
    if (taskId) {
      return [200, { code: 0, data: { ...mockTaskDetail, taskId } }]
    }
    return [400, { code: 4001, msg: 'bad_request' }]
  })

  return mock
}
