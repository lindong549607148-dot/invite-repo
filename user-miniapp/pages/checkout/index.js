const { post, get } = require('../../utils/request.js')
const { getToken } = require('../../utils/request.js')

function getIdempotencyKey(userId, skuId) {
  const now = new Date()
  const y = now.getFullYear()
  const M = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `order-${userId}-${skuId}-${y}${M}${d}${h}${m}${s}`
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
    const { productId, skuId, qty } = options
    this.setData({
      productId: productId || '',
      skuId: skuId || '',
      qty: parseInt(qty, 10) || 1,
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
        wx.redirectTo({ url: `/pages/pay/index?orderId=${orderId}` })
      })
      .catch(() => {})
      .finally(() => this.setData({ loading: false }))
  },
})
