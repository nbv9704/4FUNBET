// server/models/GameHistory.js
const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  game:      { type: String, required: true },            // ex: 'slots', 'roulette', ...
  betAmount: { type: Number, required: true },
  outcome:   { type: String, required: true },            // 'win' | 'lose' | 'tie'
  payout:    { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GameHistory', gameHistorySchema);