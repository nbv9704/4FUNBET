// server/controllers/minigames/higherLowerController.js
const User                  = require('../../models/User')
const { randomInt }         = require('../../utils/random')
const { recordGameHistory } = require('../../utils/history')

const MIN_NUMBER      = 1
const MAX_NUMBER      = 20
const MULTIPLIER_STEP = 0.5
const DEFAULT_INITIAL = 10

/**
 * POST /api/game/higherlower
 * Body: { betAmount: number, guess: 'higher'|'lower' }
 */
exports.higherLower = async (req, res) => {
  try {
    const userId = req.user.id
    const { betAmount, guess } = req.body

    // Validate inputs
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid betAmount' })
    }
    if (!['higher','lower'].includes(guess)) {
      return res.status(400).json({ error: 'guess must be "higher" or "lower"' })
    }

    // Load user and check balance
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // Determine initial number
    const initial = typeof user.higherLowerLastNumber === 'number'
      ? user.higherLowerLastNumber
      : DEFAULT_INITIAL

    // Roll next number
    const next = randomInt(MIN_NUMBER, MAX_NUMBER)

    // Check outcome
    let win = false, tie = false
    if (next === initial) {
      tie = true
    } else if ((guess === 'higher' && next > initial) || (guess === 'lower' && next < initial)) {
      win = true
    }

    // Compute payout and update streak/balance
    let payout = 0
    if (tie) {
      user.higherLowerStreak = 0
    } else if (win) {
      user.higherLowerStreak = (user.higherLowerStreak || 0) + 1
      const multiplier = user.higherLowerStreak * MULTIPLIER_STEP
      payout = betAmount * multiplier
      user.balance += payout
    } else {
      // lose
      user.higherLowerStreak = 0
      user.balance -= betAmount
    }

    // Save last number for next round
    user.higherLowerLastNumber = next
    await user.save()

    // Determine outcome label
    const outcome = tie ? 'tie' : win ? 'win' : 'lose'

    // Record to game history
    await recordGameHistory({ userId, game: 'higherlower', betAmount, outcome, payout })

    // Tính amount cho notification: nếu thắng lấy payout, không thắng lấy betAmount
    const amount = win ? payout : betAmount

    // Send response
    return res.json({
      message: tie
        ? `Tie! Both were ${initial}.`
        : win
          ? `You won! ${initial} → ${next}, streak ${user.higherLowerStreak}, payout ${payout}.`
          : `You lost. ${initial} → ${next}.`,
      initial,
      result: next,
      guess,
      tie,
      win,
      streak: user.higherLowerStreak,
      payout,
      amount,              // ← thêm trường amount
      balance: user.balance
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
