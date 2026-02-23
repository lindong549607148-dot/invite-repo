const { post, get } = require('../../utils/request.js')
const { getToken } = require('../../utils/request.js')
const { track } = require('../../utils/track.js')

function getIdempotencyKey(userId, skuId) {
  return 'wxorder_' + userId + '_' + skuId + '_' + Date.now()
}

Page({
  data: {
    productId: '',
    skuId: '',
    qty: 1,
    product: null,
    sku: null,
    loading: false,
  },

  onLoad(options) {
    const ctx = wx.getStorageSync('invite_context') || {}
    const { productId, skuId, qty } = options
    this.setData({
      productId: productId || '',
      skuId: skuId || '',
      qty: parseInt(qty, 10) || 1,
      inviteContext: ctx,
    })
    if (productId) this.loadProduct(productId)
    if (skuId) this.loadSku(productId, skuId)
  },

  loadProduct(id) {
    get(`/api/products/${id}`, true).then((product) => this.setData({ product })).catch(() => {})
  },

  loadSku(productId, skuId) {
    get(`/api/products/${productId}/skus`, true)
      .then((list) => {
        const sku = (Array.isArray(list) ? list : []).find((s) => s.id === skuId)
        this.setData({ sku })
      })
      .catch(() => {})
  },

  createOrder() {
    const { productId, skuId, qty } = this.data
    const userId = wx.getStorageSync('userId') || 'wx'
    const idempotencyKey = getIdempotencyKey(userId, skuId)
    track('order_submit', { skuId, qty: Number(qty) })

    this.setData({ loading: true })
    post(
      '/api/orders/create',
      { skuId, qty: Number(qty), idempotencyKey },
      true
    )
      .then((res) => {
        const orderId = res && res.orderId ? res.orderId : res
        if (!orderId) {
          wx.showToast({ title: '下单失败', icon: 'none' })
          return
        }
        const ctx = this.data.inviteContext || {}
        if (ctx.taskNo) {
          post('/api/tasks/bind-helper', { taskNo: ctx.taskNo }, true)
            .then((bindRes) => {
              const taskId = bindRes && bindRes.taskId ? bindRes.taskId : ctx.taskId
              track('helper_bind_success', { taskId: taskId || '' })
            })
            .catch(() => {})
        }
        wx.redirectTo({ url: `/pages/pay/index?orderId=${orderId}` })
      })
      .catch(() => {})
      .finally(() => this.setData({ loading: false }))
  },
})
