const { get } = require('../../utils/request.js')
const { track } = require('../../utils/track.js')

const HELPER_STATUS_MAP = {
  BOUND: '已邀请',
  ORDER_BOUND: '已下单',
  SHIPPED: '已发货',
  RECEIVED: '已收货',
  REJECTED: '已拒绝',
  PENDING_REVIEW: '待审核',
}

Page({
  data: {
    taskList: [],
    currentTask: null,
    progress: null,
    loading: true,
    HELPER_STATUS_MAP,
  },

  onLoad(options) {
    const taskId = options.taskId || ''
    this.setData({ taskIdFromQuery: taskId })
    this.loadTasks()
  },

  onShow() {
    if (this.data.taskList.length) this.loadProgressForCurrent()
  },

  loadTasks() {
    this.setData({ loading: true })
    get('/api/tasks/list', true)
      .then((list) => {
        const taskList = Array.isArray(list) ? list : []
        const taskIdFromQuery = this.data.taskIdFromQuery
        const current = taskIdFromQuery && taskList.find((t) => t.taskId === taskIdFromQuery)
          ? taskList.find((t) => t.taskId === taskIdFromQuery)
          : taskList[0] || null
        this.setData({ taskList, currentTask: current, loading: false })
        if (current) this.loadProgressForCurrent()
      })
      .catch(() => this.setData({ loading: false, taskList: [] }))
  },

  loadProgressForCurrent() {
    const current = this.data.currentTask
    if (!current || !current.taskId) return
    get('/api/tasks/progress?taskId=' + current.taskId, true)
      .then((progress) => this.setData({ progress }))
      .catch(() => this.setData({ progress: null }))
  },

  onShareAppMessage() {
    const task = this.data.currentTask
    const userId = wx.getStorageSync('userId') || ''
    const path = task && task.taskNo
      ? '/pages/products/list?taskNo=' + task.taskNo + '&inviter=' + userId
      : '/pages/products/list'
    track('share_initiated', { taskId: task ? task.taskId : '' })
    return {
      title: '邀请你助力免单',
      path,
    }
  },

  onShareTimeline() {
    const task = this.data.currentTask
    const userId = wx.getStorageSync('userId') || ''
    const query = task && task.taskNo ? 'taskNo=' + task.taskNo + '&inviter=' + userId : ''
    track('share_initiated', { taskId: task ? task.taskId : '' })
    return {
      title: '邀请你助力免单',
      query,
    }
  },
})
