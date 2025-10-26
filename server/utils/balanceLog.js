// server/utils/balanceLog.js
const User = require('../models/User');
const BalanceLog = require('../models/BalanceLog');

/**
 * Ghi nhật ký biến động số dư.
 * - Nếu không truyền balanceAfter, hàm sẽ tự đọc balance hiện tại của user
 *   (sau khi caller đã cập nhật vào DB).
 * - Có thể truyền session để nằm chung transaction với cập nhật số dư.
 */
async function logBalanceChange({ userId, roomId, delta, reason, balanceAfter, meta = {} }, session = null) {
  try {
    let finalBalance = balanceAfter;
    if (typeof finalBalance !== 'number') {
      const u = await User.findById(userId).select('balance').session(session).lean();
      finalBalance = u?.balance ?? 0;
    }
    if (session) {
      await BalanceLog.create([{ userId, roomId, delta, reason, balanceAfter: finalBalance, meta }], { session });
    } else {
      await BalanceLog.create({ userId, roomId, delta, reason, balanceAfter: finalBalance, meta });
    }
  } catch (e) {
    // không chặn flow nếu log lỗi
    console.error('BalanceLog error:', e.message);
  }
}

module.exports = { logBalanceChange };
