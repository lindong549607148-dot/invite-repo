const jwt = require('jsonwebtoken');
const { fail, UNAUTHORIZED } = require('../utils/resp');

function auth(req, res, next) {
  const raw = req.headers.authorization;
  if (!raw || typeof raw !== 'string' || !raw.startsWith('Bearer ')) {
    return res.status(401).json(fail(UNAUTHORIZED, 'unauthorized'));
  }
  const token = raw.slice(7).trim();
  if (!token) {
    return res.status(401).json(fail(UNAUTHORIZED, 'unauthorized'));
  }
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
    const payload = jwt.verify(token, secret);
    if (!payload || !payload.userId) {
      return res.status(401).json(fail(UNAUTHORIZED, 'unauthorized'));
    }
    req.user = { userId: String(payload.userId) };
    next();
  } catch (err) {
    return res.status(401).json(fail(UNAUTHORIZED, 'unauthorized'));
  }
}

module.exports = auth;
