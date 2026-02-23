/**
 * 环境配置：API 基地址
 * 本地联调：改为本机局域网 IP，如 http://192.168.1.100:3000
 * 生产：改为正式域名
 */
const isDev = true
const DEV_BASE = 'http://127.0.0.1:3000' // 真机联调改为局域网 IP，如 http://192.168.1.100:3000
const PROD_BASE = 'https://your-api.com'

module.exports = {
  API_BASE_URL: isDev ? DEV_BASE : PROD_BASE,
}
