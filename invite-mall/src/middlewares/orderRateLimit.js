/**
 * 下单频率限制：同 userId 每分钟最多 5 单。
 */
const { fail } = require('../utils/resp');

const WINDOW_MS = 60 * 1000;
const LIMIT = 5;
const buckets = new Map();

function orderRateLimit(req, res, next) {
  const userId = req.user && req.user.userId ? String(req.user.userId) : 'anonymous';
  const now = Date.now();
  const list = buckets.get(userId) || [];
  const recent = list.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    return res.status(429).json(fail(4291, 'too_many_requests'));
  }
  recent.push(now);
  buckets.set(userId, recent);
  next();
}

module.exports = orderRateLimit;
