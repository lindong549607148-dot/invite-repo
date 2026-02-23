/**
 * 统一请求封装：baseURL、Authorization、错误 toast
 */
const config = require('./config.js')

function getToken() {
  return wx.getStorageSync('token') || ''
}

function request(options) {
  const { url, method = 'GET', data = {}, needAuth = true } = options
  const base = config.API_BASE_URL.replace(/\/$/, '')
  const fullUrl = url.startsWith('http') ? url : base + (url.startsWith('/') ? url : '/' + url)

  const header = {
    'Content-Type': 'application/json',
    ...options.header,
  }
  if (needAuth) {
    const token = getToken()
    if (token) header.Authorization = 'Bearer ' + token
  }

  const body = method === 'POST' && data && typeof data === 'object' && Object.keys(data).length > 0
    ? JSON.stringify(data)
    : data

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data: body,
      header,
      success(res) {
        const code = res.data && res.data.code
        const msg = (res.data && res.data.msg) || '请求失败'
        if (code === 0 || code === undefined) {
          resolve(res.data.data !== undefined ? res.data.data : res.data)
        } else {
          wx.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}

function get(url, needAuth = true) {
  return request({ url, method: 'GET', needAuth })
}

function post(url, data, needAuth = true) {
  return request({ url, method: 'POST', data, needAuth })
}

module.exports = { request, get, post, getToken }
