const mongoose = require('mongoose');

const BalanceLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  roomId: { type: String, index: true },
  delta: { type: Number, required: true },          // + or -
  reason: { type: String, required: true },         // 'escrow' | 'payout_*' | 'refund_*' | ...
  balanceAfter: { type: Number, required: true },
  meta: { type: Object, default: {} },
}, { timestamps: true });

// 🔽 Index phục vụ báo cáo / truy vấn
BalanceLogSchema.index({ userId: 1, createdAt: -1 })
BalanceLogSchema.index({ roomId: 1, createdAt: -1 })

module.exports = mongoose.models.BalanceLog || mongoose.model('BalanceLog', BalanceLogSchema);
