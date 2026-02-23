const { get } = require('../../utils/request.js')

const PLACEHOLDER_IMG = 'https://via.placeholder.com/300x300?text=Product'

Page({
  data: {
    list: [],
    loading: true,
    PLACEHOLDER_IMG: 'https://via.placeholder.com/300x300?text=Product',
  },

  onLoad() {
    this.loadList()
  },

  onPullDownRefresh() {
    this.loadList().then(() => wx.stopPullDownRefresh())
  },

  loadList() {
    this.setData({ loading: true })
    return get('/api/products', true)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        this.setData({ list, loading: false })
      })
      .catch(() => this.setData({ loading: false, list: [] }))
  },

  toDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/products/detail?id=${id}` })
  },

  toOrders() {
    wx.navigateTo({ url: '/pages/orders/list' })
  },
})
