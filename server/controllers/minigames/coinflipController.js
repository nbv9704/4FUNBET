// server/controllers/minigames/coinflipController.js
const User = require('../../models/User');
const { recordGameHistory } = require('../../utils/history');
const fair = require('../../utils/fair');

/**
 * POST /api/game/coinflip
 * Body: { betAmount: number, side: 'heads' | 'tails', clientSeed?: string }
 * Solo dùng Provably Fair:
 *   - commit: seedHash = sha256(serverSeed hiện tại)
 *   - rng:    HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`)
 *   - reveal: trả serverSeed + clientSeed + nonce để user verify
 */
exports.coinflip = async (req, res) => {
  try {
    const userId = req.user.id;
    const { betAmount, side, clientSeed: rawClientSeed } = req.body || {};

    // Validate inputs
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid bet amount' });
    }
    if (!['heads', 'tails'].includes(side)) {
      return res.status(400).json({ error: 'Side must be "heads" or "tails"' });
    }

    // Load user & balance check
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // === Provably Fair commit–reveal (solo) ===
    const serverSeed = fair.getActiveServerSeed(); // commit seed (đang dùng)
    const seedHash   = fair.getSeedHash();         // sha256(serverSeed), show cho user
    const nonce      = Date.now().toString();      // mỗi ván 1 nonce (bạn có thể dùng counter, UUID,...)
    const clientSeed = String(rawClientSeed || userId);

    // RNG
    const flip = fair.coinflip({ serverSeed, clientSeed, nonce });
    const win  = flip === side;

    // Balance update
    const payout = win ? betAmount : 0;
    const delta  = win ? betAmount : -betAmount;
    user.balance += delta;
    await user.save();

    // History
    await recordGameHistory({
      userId,
      game: 'coinflip',
      betAmount,
      outcome: win ? 'win' : 'lose',
      payout,
    });

    // Response (amount = abs(delta) để withNotification wrapper dùng)
    return res.json({
      message: win
        ? `You won! The coin showed ${flip}.`
        : `You lost. The coin showed ${flip}.`,
      result: flip,
      win,
      payout,
      amount: Math.abs(delta),
      balance: user.balance,
      // verify data
      seedHash,    // commit
      serverSeed,  // reveal (solo trả luôn)
      clientSeed,
      nonce,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
