/**
 * 统一响应格式
 * 成功: { code: 0, msg: "ok", data: ... }
 * 失败: code != 0
 */

function ok(data = null) {
  return { code: 0, msg: 'ok', data };
}

function fail(code, msg, data = null) {
  return { code, msg, data };
}

const BAD_REQUEST = 4001;
const UNAUTHORIZED = 4010;
const ADMIN_UNAUTHORIZED = 4011;
const FORBIDDEN = 4030;
const INTERNAL_ERROR = 5000;
const QUOTA_BONUS_LIMIT = 4091;

module.exports = { ok, fail, BAD_REQUEST, UNAUTHORIZED, ADMIN_UNAUTHORIZED, FORBIDDEN, INTERNAL_ERROR, QUOTA_BONUS_LIMIT };
