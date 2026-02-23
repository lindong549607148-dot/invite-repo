/**
 * 结构化日志：仅在非 test 环境输出，格式 [prefix] key=value ...
 */
function isTest() {
  return process.env.NODE_ENV === 'test';
}

function formatPayload(payload) {
  if (payload == null) return '';
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    return Object.entries(payload)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(' ');
  }
  return String(payload);
}

function structuredLog(prefix, payload) {
  if (isTest()) return;
  const msg = formatPayload(payload);
  console.log(msg ? `${prefix} ${msg}` : prefix);
}

module.exports = { isTest, structuredLog, formatPayload };
