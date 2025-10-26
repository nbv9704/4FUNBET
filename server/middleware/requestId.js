// server/middleware/requestId.js
const { randomUUID } = require('crypto');

/**
 * Middleware gắn requestId cho mọi request, luôn chạy
 * kể cả khi HTTP logger đang tắt, để FE có thể trace.
 * - Nhận từ header 'x-request-id' nếu có; nếu không thì tự sinh.
 * - Trả lại 'x-request-id' trong response header.
 */
module.exports = function requestId(req, res, next) {
  const hdr = req.headers['x-request-id'];
  req.requestId = typeof hdr === 'string' && hdr.trim() ? hdr.trim() : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
};
