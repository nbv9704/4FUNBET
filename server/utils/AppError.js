// server/utils/AppError.js
class AppError extends Error {
  /**
   * @param {string} code         Mã lỗi nội bộ, ví dụ: 'PVP_ROOM_NOT_FOUND'
   * @param {number} httpStatus   HTTP status, ví dụ: 404
   * @param {string} message      Thông điệp dành cho client (ngắn gọn)
   * @param {object} meta         Thêm ngữ cảnh (không bắt buộc)
   */
  constructor(code, httpStatus, message, meta = {}) {
    super(message || code);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus || 500;
    this.meta = meta;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = { AppError };
