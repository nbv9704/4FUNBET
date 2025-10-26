// server/models/GameHistory.js
const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  game:      { type: String, required: true },
  betAmount: { type: Number, required: true },
  outcome:   { type: String, required: true },
  payout:    { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Compound index for efficient user history queries
gameHistorySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('GameHistory', gameHistorySchema);