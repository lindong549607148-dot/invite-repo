const { get } = require('../../utils/request.js')

const STATUS_MAP = {
  CREATED: '待支付',
  PAID: '已支付',
  SHIPPED: '已发货',
  RECEIVED: '已收货',
  CLOSED: '已关闭',
}

Page({
  data: {
    orderId: '',
    order: null,
    logistics: null,
    loading: true,
    STATUS_MAP,
  },

  onLoad(options) {
    const id = options.id || ''
    this.setData({ orderId: id })
    if (id) this.loadDetail(id)
  },

  loadDetail(orderId) {
    this.setData({ loading: true })
    get(`/api/orders/${orderId}`, true)
      .then((order) => {
        this.setData({ order })
        if (order.status === 'SHIPPED' || order.status === 'RECEIVED') {
          this.loadLogistics(orderId)
        }
      })
      .catch(() => {})
      .finally(() => this.setData({ loading: false }))
  },

  loadLogistics(orderId) {
    get(`/api/orders/${orderId}/logistics`, true)
      .then((logistics) => this.setData({ logistics }))
      .catch(() => this.setData({ logistics: null }))
  },

  toTasks() {
    wx.navigateTo({ url: '/pages/tasks/my' })
  },
})
