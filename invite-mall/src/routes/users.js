const express = require('express');
const router = express.Router();
const { ok, fail, BAD_REQUEST } = require('../utils/resp');
const userService = require('../services/userService');
const auth = require('../middlewares/auth');

function requireBody(req, res, keys, next) {
  const missing = keys.filter((k) => req.body[k] === undefined || req.body[k] === '');
  if (missing.length) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  next();
}

router.post('/login', (req, res, next) => {
  try {
    requireBody(req, res, ['userName'], () => {
      const result = userService.login(req.body.userName, { phone: req.body.phone });
      res.json(ok({ userId: result.userId, token: result.token }));
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, (req, res, next) => {
  try {
    const data = userService.getMe(req.user.userId);
    if (!data) {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
