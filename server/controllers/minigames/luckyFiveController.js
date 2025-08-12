// server/controllers/minigames/luckyFiveController.js
const User                  = require('../../models/User');
const { randomInt }         = require('../../utils/random');
const { recordGameHistory } = require('../../utils/history');

const NUMBER_MIN     = 1;
const NUMBER_MAX     = 100;
const DRAW_COUNT     = 5;
const ALLOWED_COLORS = ['red','orange','yellow','green','blue'];

// Payout multipliers for number matches
const numberMultipliers = { 1:1, 2:2, 3:4, 4:8, 5:16 };
// Payout multipliers for color matches
const colorMultipliers  = { 0:0, 1:0.5, 2:1, 3:2, 4:4, 5:8 };

/**
 * POST /api/game/luckyfive
 * Body: { betAmount: number, numbers: number[5], colors: string[5] }
 */
exports.luckyFive = async (req, res) => {
  try {
    const userId = req.user.id;
    const { betAmount, numbers, colors } = req.body;

    // Validate betAmount
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid betAmount' });
    }
    // Validate numbers array
    if (!Array.isArray(numbers) || numbers.length !== DRAW_COUNT ||
        !numbers.every(n => Number.isInteger(n) && n >= NUMBER_MIN && n <= NUMBER_MAX)) {
      return res.status(400).json({
        error: `numbers must be ${DRAW_COUNT} integers between ${NUMBER_MIN} and ${NUMBER_MAX}`
      });
    }
    // Validate colors array
    if (!Array.isArray(colors) || colors.length !== DRAW_COUNT ||
        !colors.every(c => ALLOWED_COLORS.includes(c))) {
      return res.status(400).json({
        error: `colors must be ${DRAW_COUNT} strings from [${ALLOWED_COLORS.join(',')}]`
      });
    }

    // Load user and check balance
    const user = await User.findById(userId);
    if (!user)    return res.status(404).json({ error: 'User not found' });
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Draw unique numbers
    const drawnNumbers = [];
    while (drawnNumbers.length < DRAW_COUNT) {
      const n = randomInt(NUMBER_MIN, NUMBER_MAX);
      if (!drawnNumbers.includes(n)) drawnNumbers.push(n);
    }
    // Draw colors
    const drawnColors = Array.from({ length: DRAW_COUNT }, () =>
      ALLOWED_COLORS[randomInt(0, ALLOWED_COLORS.length - 1)]
    );

    // Count matches
    const numberMatches = numbers.filter(n => drawnNumbers.includes(n)).length;
    let colorMatches = 0;
    colors.forEach((c,i) => { if (c === drawnColors[i]) colorMatches++; });

    // Calculate payouts
    const payoutNumber = betAmount * (numberMultipliers[numberMatches] || 0);
    const payoutColor  = betAmount * (colorMultipliers[colorMatches] || 0);
    const totalPayout  = payoutNumber + payoutColor;

    // Update balance
    user.balance = user.balance - betAmount + totalPayout;
    await user.save();

    // Determine outcome
    const win = totalPayout > 0;
    const outcome = win ? 'win' : 'lose';

    // Record history
    await recordGameHistory({
      userId,
      game: 'luckyfive',
      betAmount,
      outcome,
      payout: totalPayout
    });

    // Send response (thêm win + amount cho notification wrapper)
    return res.json({
      message: win
        ? `You won! Numbers matched: ${numberMatches} (+${payoutNumber}), Colors matched: ${colorMatches} (+${payoutColor}), total ${totalPayout}.`
        : `You lost. Numbers matched: ${numberMatches}, Colors matched: ${colorMatches}.`,
      result: { numbers: drawnNumbers, colors: drawnColors },
      matches: { numberMatches, colorMatches },
      payouts: { payoutNumber, payoutColor, totalPayout },
      win,                                   // ← thêm
      amount: win ? totalPayout : betAmount, // ← thêm
      balance: user.balance
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
