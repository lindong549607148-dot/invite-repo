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
    list: [],
    loading: true,
    STATUS_MAP,
  },

  onLoad() {
    this.loadList()
  },

  onShow() {
    this.loadList()
  },

  onPullDownRefresh() {
    this.loadList().then(() => wx.stopPullDownRefresh())
  },

  loadList() {
    this.setData({ loading: true })
    return get('/api/orders/my', true)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        this.setData({ list, loading: false })
      })
      .catch(() => this.setData({ loading: false, list: [] }))
  },

  toDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/orders/detail?id=${id}` })
  },

  toProducts() {
    wx.navigateTo({ url: '/pages/products/list' })
  },
})
