// client/src/utils/errorMap.js
const MAP = {
  // ========== AUTH ERRORS (NEW) ==========
  AUTH_TOKEN_MISSING: 'Vui lòng đăng nhập để tiếp tục',
  AUTH_TOKEN_INVALID: 'Phiên đăng nhập không hợp lệ',
  AUTH_TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
  AUTH_INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng',
  
  // ========== USER ERRORS (NEW) ==========
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  USER_DUPLICATE_USERNAME: 'Tên người dùng đã tồn tại. Vui lòng chọn tên khác',
  USER_DUPLICATE_EMAIL: 'Email đã được sử dụng',
  USER_INVALID_PASSWORD: 'Mật khẩu không đúng',
  
  // ========== RATE LIMIT ERRORS (NEW) ==========
  RATE_LIMIT_EXCEEDED: 'Bạn đang thao tác quá nhanh. Vui lòng đợi một chút',
  RATE_LIMIT_AUTH: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút',
  RATE_LIMIT_TRANSFER: 'Quá nhiều giao dịch chuyển tiền. Vui lòng đợi 5 phút',
  RATE_LIMIT_PVP: 'Quá nhiều thao tác PvP. Vui lòng đợi 1 phút',
  
  // ========== VALIDATION ERRORS (NEW) ==========
  INVALID_INPUT: 'Dữ liệu không hợp lệ',
  INVALID_USER_ID: 'ID người dùng không hợp lệ',
  INVALID_OBJECT_ID: 'Định dạng ID không đúng',
  MISSING_PARAMETER: 'Thiếu thông tin bắt buộc',

  // ========== PVP ERRORS (EXISTING - KEEP) ==========
  PVP_ROOM_NOT_FOUND: 'Phòng không tồn tại hoặc đã bị xoá.',
  PVP_ROOM_NOT_JOINABLE: 'Phòng không thể tham gia lúc này.',
  PVP_ROOM_NOT_READYABLE: 'Phòng không ở trạng thái có thể sẵn sàng.',
  PVP_ROOM_NOT_ACTIVE: 'Phòng chưa active.',
  PVP_ROOM_ALREADY_ACTIVE: 'Phòng đã active.',
  PVP_ROOM_NOT_WAITING: 'Phòng không còn ở trạng thái chờ.',
  PVP_ROOM_FULL: 'Phòng đã đủ người.',
  PVP_NOT_MEMBER: 'Bạn không nằm trong phòng này.',
  PVP_ONLY_OWNER: 'Chỉ chủ phòng mới được phép.',
  PVP_NEED_AT_LEAST_2_PLAYERS: 'Cần tối thiểu 2 người chơi.',
  PVP_ALL_PARTICIPANTS_MUST_READY: 'Tất cả người chơi phải Ready.',
  PVP_NOT_YOUR_TURN: 'Chưa tới lượt bạn.',
  PVP_TURN_ORDER_NOT_INITIALIZED: 'Thứ tự lượt chưa khởi tạo.',
  PVP_ROLL_PENDING: 'Đang xử lý lượt trước, vui lòng đợi.',
  PVP_NOT_DICE_ROOM: 'Không phải phòng xúc xắc.',
  PVP_NOT_COINFLIP_ROOM: 'Không phải phòng coinflip.',
  PVP_ROOM_NOT_FINISHED: 'Ván chơi chưa kết thúc.',

  // ========== WALLET ERRORS (EXISTING - KEEP) ==========
  INVALID_AMOUNT: 'Số tiền không hợp lệ.',
  INSUFFICIENT_BALANCE: 'Số dư không đủ.',
  INSUFFICIENT_BANK_BALANCE: 'Số dư ngân hàng không đủ.',
  INVALID_TRANSFER_DATA: 'Dữ liệu chuyển tiền không hợp lệ.',

  // ========== GENERAL (EXISTING - KEEP) ==========
  INTERNAL_ERROR: 'Có lỗi xảy ra, vui lòng thử lại sau.',
  NOT_FOUND: 'Không tìm thấy tài nguyên.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  BAD_REQUEST: 'Yêu cầu không hợp lệ.',
};

export function mapErrorFromPayload(payload) {
  const code = payload?.code || 'INTERNAL_ERROR';
  let msg = payload?.message || MAP[code] || payload?.message || 'Lỗi không xác định.';

  // Special handling for INSUFFICIENT_BALANCE
  if (code === 'INSUFFICIENT_BALANCE' && payload?.meta) {
    const need = payload.meta.required ?? payload.meta.need ?? payload.meta.amount;
    const have = payload.meta.have ?? payload.meta.balance;
    const hasDetail = /\bSố dư cần\b|\brequired\b|\bhave\b/i.test(msg);
    if ((need != null || have != null) && !hasDetail) {
      const lines = ['Số dư không đủ.'];
      if (need != null) lines.push(`Số dư cần để thực hiện: ${need}`);
      if (have != null) lines.push(`Số dư hiện có: ${have}`);
      msg = lines.join('\n');
    }
  }

  return { code, message: msg, requestId: payload?.requestId };
}

export function mapError(e) {
  const payload = e?.__payload || e?.response?.data || e?.data || null;
  if (payload && (payload.code || payload.message)) {
    return mapErrorFromPayload(payload);
  }
  return { code: 'INTERNAL_ERROR', message: MAP.INTERNAL_ERROR, requestId: undefined };
}