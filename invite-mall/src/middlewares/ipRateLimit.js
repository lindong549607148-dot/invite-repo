/**
 * IP 频率限制：同 IP 每小时最多 100 次。
 */
const { fail } = require('../utils/resp');

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 100;
const buckets = new Map();

function getIp(req) {
  const header = req.headers['x-forwarded-for'];
  if (header) return String(header).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function ipRateLimit(req, res, next) {
  const ip = getIp(req);
  const now = Date.now();
  const list = buckets.get(ip) || [];
  const recent = list.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    return res.status(429).json(fail(4292, 'ip_rate_limited'));
  }
  recent.push(now);
  buckets.set(ip, recent);
  next();
}

module.exports = ipRateLimit;
