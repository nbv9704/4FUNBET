// server/controllers/minigames/coinflipController.js
const User                   = require('../../models/User')
const { recordGameHistory }  = require('../../utils/history')

/**
 * POST /api/game/coinflip
 * Body: { betAmount: number, side: 'heads' | 'tails' }
 */
exports.coinflip = async (req, res) => {
  try {
    const userId      = req.user.id
    const { betAmount, side } = req.body

    // Validate inputs
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid bet amount' })
    }
    if (!['heads', 'tails'].includes(side)) {
      return res.status(400).json({ error: 'Side must be "heads" or "tails"' })
    }

    // Load user and check balance
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // Flip coin
    const flip = Math.random() < 0.5 ? 'heads' : 'tails'
    const win  = flip === side

    // Update balance
    const delta = win ? betAmount : -betAmount
    user.balance += delta
    await user.save()

    // Record history
    await recordGameHistory({
      userId,
      game:      'coinflip',
      betAmount,
      outcome:   win ? 'win' : 'lose',
      payout:    win ? betAmount : 0
    })

    // Respond (thêm field `amount` để wrapper withNotification có thể dùng)
    return res.json({
      message: win
        ? `You won! The coin showed ${flip}.`
        : `You lost. The coin showed ${flip}.`,
      result:  flip,
      win,
      amount: Math.abs(delta),
      balance: user.balance
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
