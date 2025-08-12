// server/controllers/minigames/rouletteController.js
const User                  = require('../../models/User');
const { randomInt }         = require('../../utils/random');
const { recordGameHistory } = require('../../utils/history');

// Payout multipliers
const MULTIPLIER_ZERO  = 16;  // for 0 (green)
const MULTIPLIER_RANGE = 4;   // for ranges 1–9, 10–18, 19–27, 28–36
const MULTIPLIER_COLOR = 2;   // for red/black

/**
 * POST /api/game/roulette
 * Body: {
 *   betAmount: number,
 *   betType: 'zero'|'range'|'color',
 *   betValue: number|string  // if 'range': '1-9'|'10-18'|'19-27'|'28-36'; if 'color': 'red'|'black'; if 'zero': ignored
 * }
 */
exports.roulette = async (req, res) => {
  try {
    const userId       = req.user.id;
    const { betAmount, betType, betValue } = req.body;

    // 1. Validate betAmount
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid bet amount' });
    }

    // 2. Validate betType and betValue
    if (betType === 'range') {
      const validRanges = ['1-9','10-18','19-27','28-36'];
      if (typeof betValue !== 'string' || !validRanges.includes(betValue)) {
        return res.status(400).json({ error: 'betValue must be one of ' + validRanges.join(', ') });
      }
    } else if (betType === 'color') {
      if (!['red', 'black'].includes(betValue)) {
        return res.status(400).json({ error: 'betValue must be "red" or "black"' });
      }
    } else if (betType !== 'zero') {
      return res.status(400).json({ error: 'betType must be "zero", "range" or "color"' });
    }

    // 3. Load user and check balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 4. Spin wheel
    const spinResult = randomInt(0, 36);
    let spinColor;
    if (spinResult === 0) {
      spinColor = 'green';
    } else if (spinResult % 2 === 0) {
      spinColor = 'black';
    } else {
      spinColor = 'red';
    }

    // 5. Check win and calculate payout
    let win    = false;
    let payout = 0;

    if (betType === 'zero' && spinResult === 0) {
      win    = true;
      payout = betAmount * MULTIPLIER_ZERO;
    } else if (betType === 'range') {
      const [min, max] = betValue.split('-').map(Number);
      if (spinResult >= min && spinResult <= max) {
        win    = true;
        payout = betAmount * MULTIPLIER_RANGE;
      }
    } else if (betType === 'color' && spinColor === betValue) {
      win    = true;
      payout = betAmount * MULTIPLIER_COLOR;
    }

    // 6. Update balance
    if (win) {
      user.balance += payout;
    } else {
      user.balance -= betAmount;
    }
    await user.save();

    // 7. Record to game history
    await recordGameHistory({
      userId,
      game: 'roulette',
      betAmount,
      outcome: win ? 'win' : 'lose',
      payout:  win ? payout : 0
    });

    // 8. Respond (add `amount` for notification wrapper)
    return res.json({
      message: win
        ? `You won! The wheel landed on ${spinResult} (${spinColor}), payout ${payout}.`
        : `You lost. The wheel landed on ${spinResult} (${spinColor}).`,
      result: { number: spinResult, color: spinColor },
      win,
      payout,
      amount: win ? payout : betAmount, // ← added: used by withNotification()
      balance: user.balance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
