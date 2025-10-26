// server/utils/ErrorCodes.js

/**
 * Centralized error codes for consistent error handling across the application.
 * Format: CATEGORY_SPECIFIC_ERROR
 */

const ErrorCodes = {
  // === AUTHENTICATION & AUTHORIZATION ===
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_EXISTS: 'AUTH_USER_EXISTS',

  // === USER ERRORS ===
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_DUPLICATE_USERNAME: 'USER_DUPLICATE_USERNAME',
  USER_DUPLICATE_EMAIL: 'USER_DUPLICATE_EMAIL',
  USER_INVALID_PASSWORD: 'USER_INVALID_PASSWORD',

  // === WALLET & BALANCE ===
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_BANK_BALANCE: 'INSUFFICIENT_BANK_BALANCE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_TRANSFER_DATA: 'INVALID_TRANSFER_DATA',

  // === PVP ROOM ERRORS ===
  PVP_ROOM_NOT_FOUND: 'PVP_ROOM_NOT_FOUND',
  PVP_ROOM_NOT_JOINABLE: 'PVP_ROOM_NOT_JOINABLE',
  PVP_ROOM_NOT_READYABLE: 'PVP_ROOM_NOT_READYABLE',
  PVP_ROOM_NOT_ACTIVE: 'PVP_ROOM_NOT_ACTIVE',
  PVP_ROOM_ALREADY_ACTIVE: 'PVP_ROOM_ALREADY_ACTIVE',
  PVP_ROOM_NOT_WAITING: 'PVP_ROOM_NOT_WAITING',
  PVP_ROOM_FULL: 'PVP_ROOM_FULL',
  PVP_ROOM_NOT_FINISHED: 'PVP_ROOM_NOT_FINISHED',

  // === PVP PERMISSIONS ===
  PVP_NOT_MEMBER: 'PVP_NOT_MEMBER',
  PVP_ONLY_OWNER: 'PVP_ONLY_OWNER',
  PVP_NOT_YOUR_TURN: 'PVP_NOT_YOUR_TURN',

  // === PVP GAME LOGIC ===
  PVP_NEED_AT_LEAST_2_PLAYERS: 'PVP_NEED_AT_LEAST_2_PLAYERS',
  PVP_ALL_PARTICIPANTS_MUST_READY: 'PVP_ALL_PARTICIPANTS_MUST_READY',
  PVP_TURN_ORDER_NOT_INITIALIZED: 'PVP_TURN_ORDER_NOT_INITIALIZED',
  PVP_ROLL_PENDING: 'PVP_ROLL_PENDING',
  PVP_NOT_DICE_ROOM: 'PVP_NOT_DICE_ROOM',
  PVP_NOT_COINFLIP_ROOM: 'PVP_NOT_COINFLIP_ROOM',

  // === INPUT VALIDATION ===
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_USER_ID: 'INVALID_USER_ID',
  INVALID_OBJECT_ID: 'INVALID_OBJECT_ID',
  MISSING_PARAMETER: 'MISSING_PARAMETER',

  // === RATE LIMITING ===
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_AUTH: 'RATE_LIMIT_AUTH',
  RATE_LIMIT_TRANSFER: 'RATE_LIMIT_TRANSFER',
  RATE_LIMIT_PVP: 'RATE_LIMIT_PVP',
  RATE_LIMIT_CREATE_ROOM: 'RATE_LIMIT_CREATE_ROOM',

  // === GENERIC ===
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
};

// Human-readable messages for each error code (Vietnamese)
const ErrorMessages = {
  [ErrorCodes.AUTH_TOKEN_MISSING]: 'Không tìm thấy token xác thực',
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'Token xác thực không hợp lệ',
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 'Token xác thực đã hết hạn',
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Tên đăng nhập hoặc mật khẩu không đúng',
  [ErrorCodes.AUTH_USER_EXISTS]: 'Tài khoản đã tồn tại',

  [ErrorCodes.USER_NOT_FOUND]: 'Không tìm thấy người dùng',
  [ErrorCodes.USER_DUPLICATE_USERNAME]: 'Tên người dùng đã tồn tại',
  [ErrorCodes.USER_DUPLICATE_EMAIL]: 'Email đã được sử dụng',
  [ErrorCodes.USER_INVALID_PASSWORD]: 'Mật khẩu không đúng',

  [ErrorCodes.INSUFFICIENT_BALANCE]: 'Số dư không đủ',
  [ErrorCodes.INSUFFICIENT_BANK_BALANCE]: 'Số dư ngân hàng không đủ',
  [ErrorCodes.INVALID_AMOUNT]: 'Số tiền không hợp lệ',
  [ErrorCodes.INVALID_TRANSFER_DATA]: 'Dữ liệu chuyển tiền không hợp lệ',

  [ErrorCodes.PVP_ROOM_NOT_FOUND]: 'Không tìm thấy phòng',
  [ErrorCodes.PVP_ROOM_NOT_JOINABLE]: 'Không thể tham gia phòng này',
  [ErrorCodes.PVP_ROOM_FULL]: 'Phòng đã đầy',
  [ErrorCodes.PVP_NOT_MEMBER]: 'Bạn không phải thành viên của phòng',
  [ErrorCodes.PVP_ONLY_OWNER]: 'Chỉ chủ phòng mới có quyền thực hiện',
  [ErrorCodes.PVP_NOT_YOUR_TURN]: 'Chưa đến lượt của bạn',

  [ErrorCodes.INVALID_INPUT]: 'Dữ liệu đầu vào không hợp lệ',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
  [ErrorCodes.INTERNAL_ERROR]: 'Lỗi hệ thống, vui lòng thử lại sau',
};

module.exports = {
  ErrorCodes,
  ErrorMessages,
};