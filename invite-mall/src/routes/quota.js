const express = require('express');
const router = express.Router();
const { ok, fail, BAD_REQUEST, QUOTA_BONUS_LIMIT } = require('../utils/resp');
const quotaService = require('../services/quotaService');

function requireBody(req, res, keys, next) {
  const missing = keys.filter((k) => req.body[k] === undefined || req.body[k] === '');
  if (missing.length) {
    return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
  }
  next();
}

router.post('/claim-bonus', (req, res, next) => {
  requireBody(req, res, ['type'], () => {
    const type = req.body.type;
    if (type !== 'share' && type !== 'invite') {
      return res.status(400).json(fail(BAD_REQUEST, 'bad_request'));
    }
    const result = quotaService.claimBonus(req.user.userId);
    if (result.err === 'quota_bonus_limit') {
      return res.status(409).json(fail(QUOTA_BONUS_LIMIT, 'quota_bonus_limit'));
    }
    res.json(ok(result.quota));
  });
});

module.exports = router;
