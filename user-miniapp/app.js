/**
 * 用户端小程序入口：登录拿 token 并存 storage
 */
const { post, getToken } = require('./utils/request.js')

App({
  onLaunch() {
    this.ensureLogin()
  },

  ensureLogin() {
    if (getToken()) return
    const userName = 'wx_' + (wx.getStorageSync('openid') || Date.now())
    post('/api/users/login', { userName }, false)
      .then((data) => {
        if (data && data.token) {
          wx.setStorageSync('token', data.token)
          if (data.userId) wx.setStorageSync('userId', data.userId)
        }
      })
      .catch(() => {})
  },
})
