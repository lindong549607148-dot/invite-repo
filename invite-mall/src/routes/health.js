const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ code: 0, msg: 'ok', data: { status: 'up' } });
});

module.exports = router;
