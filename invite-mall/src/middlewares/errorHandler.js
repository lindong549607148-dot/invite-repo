const { fail, INTERNAL_ERROR } = require('../utils/resp');

function errorHandler(err, req, res, next) {
  const requestId = req.requestId || 'unknown';
  console.error(`[${requestId}] internal_error`, err.stack);
  res.status(500).json(fail(INTERNAL_ERROR, 'internal_error'));
}

module.exports = errorHandler;
