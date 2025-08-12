// server/controllers/minigames/diceController.js
const User                  = require('../../models/User')
const { randomInt }         = require('../../utils/random')
const { recordGameHistory } = require('../../utils/history')

// Supported dice sides and multipliers
const ALLOWED_SIDES = [4, 6, 8, 10, 12, 20]
const MULTIPLIERS   = { 4: 2, 6: 3, 8: 4, 10: 5, 12: 6, 20: 10 }

/**
 * POST /api/game/dice
 * Body: {
 *   betAmount: number,
 *   sides?: number,   // optional, default 6
 *   guess: number     // integer between 1 and sides
 * }
 */
exports.dice = async (req, res) => {
  try {
    const userId                 = req.user.id
    const { betAmount, sides = 6, guess } = req.body

    // Validate betAmount
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid betAmount' })
    }
    // Validate sides
    if (typeof sides !== 'number' || !ALLOWED_SIDES.includes(sides)) {
      return res.status(400).json({ error: `sides must be one of ${ALLOWED_SIDES.join(', ')}` })
    }
    // Validate guess
    if (typeof guess !== 'number' || guess < 1 || guess > sides) {
      return res.status(400).json({ error: `guess must be between 1 and ${sides}` })
    }

    // Load user and check balance
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // Roll the dice
    const result     = randomInt(1, sides)
    const win        = result === guess
    const multiplier = MULTIPLIERS[sides]
    const payout     = win ? betAmount * multiplier : 0

    // Update balance
    user.balance += win ? payout : -betAmount
    await user.save()

    // Record history
    await recordGameHistory({
      userId,
      game: 'dice',
      betAmount,
      outcome: win ? 'win' : 'lose',
      payout
    })

    // Respond (thêm amount)
    return res.json({
      message: win
        ? `You won! You rolled ${result} on a d${sides}, payout ${payout}.`
        : `You lost. You rolled ${result} on a d${sides}.`,
      result,
      sides,
      win,
      multiplier,
      payout,
      amount: win ? payout : betAmount,  // ← thêm trường amount
      balance: user.balance
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
