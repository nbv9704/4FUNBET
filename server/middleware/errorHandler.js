// server/middleware/errorHandler.js
const { AppError } = require('../utils/AppError');

module.exports = function errorHandler(err, req, res, _next) {
  const requestId = req.requestId; // nếu có middleware requestId thì sẽ set
  const isAppError = err instanceof AppError;

  if (!isAppError) {
    // Không lộ stack ra ngoài client
    console.error(
      '[UNHANDLED]',
      requestId ? `(req:${requestId})` : '',
      err?.message,
      err?.stack
    );
  }

  const httpStatus = isAppError ? (err.httpStatus || 500) : 500;
  const code = isAppError ? (err.code || 'INTERNAL_ERROR') : 'INTERNAL_ERROR';

  // Thông điệp chính (giữ xuống dòng \n nếu có)
  const message = err?.message || 'Internal server error';

  // Giữ tương thích với FE: trả cả message và error
  const payload = {
    ok: false,
    code,
    message,
    error: message, // FE (useApi) có thể đọc data.error
  };

  if (requestId) payload.requestId = requestId;

  // === META EXPOSURE POLICY ===
  // - Production: chỉ whitelists một số mã an toàn (vd: thiếu số dư) và chỉ các field cần thiết
  // - Non-prod: trả full meta để debug
  if (isAppError && err.meta) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      payload.meta = err.meta;
    } else {
      const SAFE_META_CODES = new Set(['INSUFFICIENT_BALANCE']);
      if (SAFE_META_CODES.has(code)) {
        const src = err.meta || {};
        const safe = {};
        // Chuẩn hoá 'required'
        if (src.required != null) safe.required = src.required;
        else if (src.need != null) safe.required = src.need;
        else if (src.amount != null) safe.required = src.amount;
        // Chuẩn hoá 'have'
        if (src.have != null) safe.have = src.have;
        else if (src.balance != null) safe.have = src.balance;

        if (Object.keys(safe).length > 0) {
          payload.meta = safe;
        }
      }
    }
  }

  res.status(httpStatus).json(payload);
};
