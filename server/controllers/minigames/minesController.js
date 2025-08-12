// server/controllers/minigames/minesController.js
const User                  = require('../../models/User');
const { randomInt }         = require('../../utils/random');
const { recordGameHistory } = require('../../utils/history');

const ROWS        = 15;
const COLS        = 15;
const TOTAL_CELLS = ROWS * COLS;  // 225 cells
const MINE_COUNT  = 40;
const MAX_PICKS   = 10;

// Multipliers by how many safe picks
const MULTIPLIERS = {
   0:  0, 1:  0.5, 2:  0.75, 3:  1, 4: 1.5,
   5:  2, 6:  3,    7:  4,    8:  5, 9:   8,
  10: 10
};

// In-memory game state (for production use Redis/DB)
const games = new Map();

/**
 * POST /api/game/mines/start
 * Body: { betAmount: number }
 */
exports.startMines = async (req, res) => {
  const userId    = req.user.id;
  const { betAmount } = req.body;

  if (games.has(userId)) {
    return res.status(400).json({ error: 'A game is already in progress' });
  }
  if (typeof betAmount !== 'number' || betAmount <= 0) {
    return res.status(400).json({ error: 'Invalid betAmount' });
  }

  const user = await User.findById(userId);
  if (!user)    return res.status(404).json({ error: 'User not found' });
  if (user.balance < betAmount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Hold stake
  user.balance -= betAmount;
  await user.save();

  // Place mines
  const mines = new Set();
  while (mines.size < MINE_COUNT) {
    mines.add(randomInt(0, TOTAL_CELLS - 1));
  }

  games.set(userId, { betAmount, mines, picks: new Set() });

  return res.json({ message: 'Game started', maxPicks: MAX_PICKS, balance: user.balance });
};

/**
 * POST /api/game/mines/pick
 * Body: { index: number }
 */
exports.pickMines = async (req, res) => {
  const userId = req.user.id;
  const { index } = req.body;
  const state = games.get(userId);
  if (!state) {
    return res.status(400).json({ error: 'No active game. Call /mines/start first.' });
  }

  if (!Number.isInteger(index) || index < 0 || index >= TOTAL_CELLS) {
    return res.status(400).json({ error: `index must be 0..${TOTAL_CELLS - 1}` });
  }
  if (state.picks.has(index)) {
    return res.status(400).json({ error: 'Cell already picked' });
  }

  state.picks.add(index);
  const user = await User.findById(userId);

  // Hit a mine -> kết thúc (thua)
  if (state.mines.has(index)) {
    games.delete(userId);
    const payout = 0;
    // Record history
    await recordGameHistory({
      userId, game: 'mines', betAmount: state.betAmount, outcome: 'lose', payout
    });
    return res.json({
      message: `Boom! You hit a mine on pick #${state.picks.size}.`,
      mined: true,
      pickCount: state.picks.size,
      payout,
      win: false,                 // ← thêm cho notification wrapper
      amount: state.betAmount,    // ← số tiền bị mất
      balance: user.balance
    });
  }

  const pickCount = state.picks.size;
  // Cleared all picks -> kết thúc (thắng)
  if (pickCount >= MAX_PICKS) {
    const multiplier = MULTIPLIERS[pickCount] || 0;
    const payout     = state.betAmount * multiplier;
    user.balance    += payout;
    await user.save();
    games.delete(userId);
    // Record history
    await recordGameHistory({
      userId, game: 'mines', betAmount: state.betAmount, outcome: 'win', payout
    });
    return res.json({
      message: `You cleared all ${MAX_PICKS} picks!`,
      mined: false,
      pickCount,
      multiplier,
      payout,
      win: true,          // ← thêm cho notification wrapper
      amount: payout,     // ← số tiền thắng
      balance: user.balance
    });
  }

  // Continue game (đừng thêm win/amount để tránh bắn notify)
  return res.json({
    message: `Safe! You have picked ${pickCount}/${MAX_PICKS}.`,
    mined: false,
    pickCount,
    balance: user.balance
  });
};
