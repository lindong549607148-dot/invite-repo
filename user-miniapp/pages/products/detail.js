const { get } = require('../../utils/request.js')

const PLACEHOLDER_IMG = 'https://via.placeholder.com/300x300?text=Product'

Page({
  data: {
    product: null,
    skus: [],
    selectedSku: null,
    qty: 1,
    loading: true,
    PLACEHOLDER_IMG,
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.setData({ productId: id })
    this.loadProduct(id)
    this.loadSkus(id)
  },

  loadProduct(id) {
    get(`/api/products/${id}`, true)
      .then((product) => this.setData({ product }))
      .catch(() => {})
  },

  loadSkus(productId) {
    get(`/api/products/${productId}/skus`, true)
      .then((skus) => {
        const list = Array.isArray(skus) ? skus : []
        const selectedSku = list.length ? list[0] : null
        this.setData({ skus: list, selectedSku, loading: false })
      })
      .catch(() => this.setData({ loading: false, skus: [] }))
  },

  selectSku(e) {
    const sku = e.currentTarget.dataset.sku
    this.setData({ selectedSku: sku })
  },

  qtyChange(e) {
    const qty = Math.max(1, parseInt(e.detail.value, 10) || 1)
    this.setData({ qty })
  },

  submitOrder() {
    const { productId, selectedSku, qty } = this.data
    if (!selectedSku) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/checkout/index?productId=${productId}&skuId=${selectedSku.id}&qty=${qty}`,
    })
  },
})
