// server/controllers/minigames/diceController.js
const User = require('../../models/User');
const { recordGameHistory } = require('../../utils/history');
const fair = require('../../utils/fair');

// Supported dice sides and multipliers
const ALLOWED_SIDES = [4, 6, 8, 10, 12, 20];
const MULTIPLIERS   = { 4: 2, 6: 3, 8: 4, 10: 5, 12: 6, 20: 10 };

/**
 * POST /api/game/dice
 * Body: { betAmount: number, sides?: number (default 6), guess: number, clientSeed?: string }
 * Provably Fair:
 *   result = floor(hmacFloat(serverSeed, `${clientSeed}:${nonce}`) * sides) + 1
 *   server trả seedHash + serverSeed + clientSeed + nonce để verify (UI không cần hiển thị).
 */
exports.dice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { betAmount, sides = 6, guess, clientSeed: rawClientSeed } = req.body || {};

    // Validate betAmount
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid betAmount' });
    }
    // Validate sides
    if (typeof sides !== 'number' || !ALLOWED_SIDES.includes(sides)) {
      return res.status(400).json({ error: `sides must be one of ${ALLOWED_SIDES.join(', ')}` });
    }
    // Validate guess
    if (typeof guess !== 'number' || guess < 1 || guess > sides) {
      return res.status(400).json({ error: `guess must be between 1 and ${sides}` });
    }

    // Load user and check balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // === Provably Fair commit–reveal ===
    const serverSeed = fair.getActiveServerSeed(); // commit seed hiện hành
    const seedHash   = fair.getSeedHash();         // sha256(serverSeed) để verify
    const nonce      = Date.now().toString();      // mỗi ván 1 nonce
    const clientSeed = String(rawClientSeed || userId);

    // PF roll: 1..sides
    const rollFloat = fair.hmacFloat({ serverSeed, clientSeed, nonce });
    const result    = Math.floor(rollFloat * sides) + 1;

    const win        = result === guess;
    const multiplier = MULTIPLIERS[sides];
    const payout     = win ? betAmount * multiplier : 0;

    // Update balance (delta = payout - bet)
    const delta = win ? (payout - betAmount) : -betAmount;
    user.balance += delta;
    await user.save();

    // History
    await recordGameHistory({
      userId, game: 'dice', betAmount,
      outcome: win ? 'win' : 'lose', payout
    });

    // Respond (UI không cần show verify; nhưng trả ra để có thể kiểm tra)
    return res.json({
      message: win
        ? `You won! You rolled ${result} on a d${sides}, payout ${payout}.`
        : `You lost. You rolled ${result} on a d${sides}.`,
      result, sides, win, multiplier, payout,
      amount: win ? (payout - betAmount) : betAmount, // for notifications
      balance: user.balance,
      // verify data (ẩn trên UI)
      seedHash, serverSeed, clientSeed, nonce,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
