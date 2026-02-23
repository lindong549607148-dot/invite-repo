const { fail, ADMIN_UNAUTHORIZED } = require('../utils/resp');

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  const expected = process.env.ADMIN_KEY || 'dev-admin-key';
  if (!key || key !== expected) {
    return res.status(401).json(fail(ADMIN_UNAUTHORIZED, 'admin_unauthorized'));
  }
  next();
}

module.exports = adminAuth;
