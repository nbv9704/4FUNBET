// server/controllers/minigames/towerController.js
const User                  = require('../../models/User');
const { recordGameHistory } = require('../../utils/history');

const SUCCESS_PROB      = 0.5;  // 50% chance to ascend
const MAX_LEVEL         = 15;
const LEVEL_MULTIPLIERS = {
   1:1,   2:1.25, 3:1.5,  4:2,   5:3,
   6:4,   7:5,    8:6,    9:7,  10:8,
  11:9,  12:10,  13:15,  14:20, 15:50
};

// In-memory state (production nên dùng Redis/DB)
const towerGames = new Map();

/**
 * POST /api/game/tower/start
 * Body: { betAmount: number }
 */
exports.startTower = async (req, res) => {
  const userId    = req.user.id;
  const { betAmount } = req.body;

  // Already playing?
  if (towerGames.has(userId)) {
    return res.status(400).json({ error: 'A tower game is already in progress' });
  }
  // Validate bet
  if (typeof betAmount !== 'number' || betAmount <= 0) {
    return res.status(400).json({ error: 'Invalid betAmount' });
  }

  // Load user & check balance
  const user = await User.findById(userId);
  if (!user)    return res.status(404).json({ error: 'User not found' });
  if (user.balance < betAmount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Hold stake
  user.balance -= betAmount;
  await user.save();

  // Init game
  towerGames.set(userId, { betAmount, currentLevel: 0 });

  return res.json({
    message: 'Tower game started',
    currentLevel: 0,
    balance: user.balance
  });
};

/**
 * POST /api/game/tower/ascend
 * Body: {}
 */
exports.ascendTower = async (req, res) => {
  const userId = req.user.id;
  const state  = towerGames.get(userId);
  if (!state) {
    return res.status(400).json({ error: 'No active tower game. Call /tower/start first.' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const success = Math.random() < SUCCESS_PROB;
  // Bust: lose everything (kết thúc ván -> thêm win & amount)
  if (!success) {
    towerGames.delete(userId);
    // Record loss
    await recordGameHistory({
      userId,
      game: 'tower',
      betAmount: state.betAmount,
      outcome: 'lose',
      payout: 0
    });
    return res.json({
      message: `You busted at level ${state.currentLevel + 1}.`,
      bustedLevel: state.currentLevel + 1,
      payout: 0,
      balance: user.balance,
      win: false,
      amount: state.betAmount // để wrapper bắn "game_loss"
    });
  }

  // Ascend
  state.currentLevel++;
  // Auto-cashout at max (kết thúc ván -> thêm win & amount)
  if (state.currentLevel >= MAX_LEVEL) {
    const multiplier = LEVEL_MULTIPLIERS[MAX_LEVEL];
    const payout     = state.betAmount * multiplier;
    user.balance += payout;
    await user.save();
    towerGames.delete(userId);
    // Record win
    await recordGameHistory({
      userId,
      game: 'tower',
      betAmount: state.betAmount,
      outcome: 'win',
      payout
    });
    return res.json({
      message: `Congratulations! You reached level ${MAX_LEVEL}.`,
      level: MAX_LEVEL,
      multiplier,
      payout,
      balance: user.balance,
      win: true,
      amount: payout // để wrapper bắn "game_win"
    });
  }

  // Continue playing (chưa kết thúc -> KHÔNG thêm win/amount)
  return res.json({
    message: `Success! You are now at level ${state.currentLevel}.`,
    currentLevel: state.currentLevel,
    balance: user.balance
  });
};

/**
 * POST /api/game/tower/cashout
 * Body: {}
 */
exports.cashoutTower = async (req, res) => {
  const userId = req.user.id;
  const state  = towerGames.get(userId);
  if (!state) {
    return res.status(400).json({ error: 'No active tower game. Call /tower/start first.' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const level      = state.currentLevel;
  const multiplier = LEVEL_MULTIPLIERS[level] || 0;
  const payout     = state.betAmount * multiplier;

  // Payout & end game
  user.balance += payout;
  await user.save();
  towerGames.delete(userId);

  // Record win
  await recordGameHistory({
    userId,
    game: 'tower',
    betAmount: state.betAmount,
    outcome: 'win',
    payout
  });

  return res.json({
    message: `You cashed out at level ${level}.`,
    level,
    multiplier,
    payout,
    balance: user.balance,
    win: true,
    amount: payout // để wrapper bắn "game_win"
  });
};
