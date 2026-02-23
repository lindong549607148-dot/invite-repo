/**
 * 为每个请求附加 requestId（时间戳+随机数），便于日志追踪
 */
function requestId(req, res, next) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  req.requestId = id;
  next();
}

module.exports = requestId;
