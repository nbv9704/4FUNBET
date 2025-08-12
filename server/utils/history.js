// server/utils/history.js
const GameHistory = require('../models/GameHistory');

async function recordGameHistory({ userId, game, betAmount, outcome, payout }) {
  try {
    await GameHistory.create({ user: userId, game, betAmount, outcome, payout });
  } catch (err) {
    console.error('Error recording game history:', err);
  }
}

module.exports = { recordGameHistory };