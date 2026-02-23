const { post, get } = require('../../utils/request.js')
const { track } = require('../../utils/track.js')

Page({
  data: {
    orderId: '',
    order: null,
    loading: false,
    payLoading: false,
  },

  onLoad(options) {
    const orderId = options.orderId || ''
    this.setData({ orderId })
    if (orderId) this.loadOrder(orderId)
  },

  loadOrder(orderId) {
    get(`/api/orders/${orderId}`, true)
      .then((order) => this.setData({ order }))
      .catch(() => {})
  },

  mockPay() {
    const { orderId } = this.data
    if (!orderId) return
    this.setData({ payLoading: true })
    post('/api/pay/create', { orderId }, true)
      .then(() => post('/api/pay/notify', { orderId }, true))
      .then(() => {
        wx.showToast({ title: '支付成功', icon: 'success' })
        track('pay_success', { orderId })
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/orders/detail?orderId=${orderId}` })
        }, 1500)
      })
      .catch(() => {})
      .finally(() => this.setData({ payLoading: false }))
  },
})
