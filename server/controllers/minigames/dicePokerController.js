// server/controllers/minigames/dicePokerController.js
const User                 = require('../../models/User')
const { randomInt }        = require('../../utils/random')
const { recordGameHistory } = require('../../utils/history')

// Multiplier table by poker hand
const HAND_MULTIPLIERS = {
  'Five of a Kind': 20,
  'Four of a Kind': 10,
  'Full House':      8,
  'Straight':        5,
  'Three of a Kind': 3,
  'Two Pair':        2,
  'One Pair':        1,
  'High Card':       0
}

/**
 * Determine poker hand from an array of 5 dice.
 * @param {number[]} dice
 * @returns {string}
 */
function evaluateHand(dice) {
  const counts = {}
  dice.forEach(d => counts[d] = (counts[d] || 0) + 1)
  const freqs = Object.values(counts).sort((a, b) => b - a)

  if (freqs[0] === 5) return 'Five of a Kind'
  if (freqs[0] === 4) return 'Four of a Kind'
  if (freqs[0] === 3 && freqs[1] === 2) return 'Full House'

  const sorted = Array.from(new Set(dice)).sort((a, b) => a - b)
  const straight1 = [1,2,3,4,5]
  const straight2 = [2,3,4,5,6]
  if (sorted.length === 5 &&
      (straight1.every((v,i) => sorted[i] === v) ||
       straight2.every((v,i) => sorted[i] === v))) {
    return 'Straight'
  }

  if (freqs[0] === 3) return 'Three of a Kind'
  if (freqs[0] === 2 && freqs[1] === 2) return 'Two Pair'
  if (freqs[0] === 2) return 'One Pair'

  return 'High Card'
}

/**
 * POST /api/game/dicepoker
 * Body: { betAmount: number }
 */
exports.dicePoker = async (req, res) => {
  try {
    const userId     = req.user.id
    const { betAmount } = req.body

    // Validate bet amount
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid betAmount' })
    }

    // Load user and check balance
    const user = await User.findById(userId)
    if (!user)    return res.status(404).json({ error: 'User not found' })
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // Roll 5 dice
    const dice = Array.from({ length: 5 }, () => randomInt(1, 6))

    // Evaluate hand and get multiplier
    const hand       = evaluateHand(dice)
    const multiplier = HAND_MULTIPLIERS[hand] || 0

    // Calculate payout and update balance
    const payout = betAmount * multiplier
    user.balance = user.balance - betAmount + payout
    await user.save()

    // Determine outcome
    const outcome = multiplier > 0 ? 'win' : 'lose'

    // Record to game history
    await recordGameHistory({ userId, game: 'dicepoker', betAmount, outcome, payout })

    // Send response
    return res.json({
      hand,
      dice,
      multiplier,
      payout,
      win: amount => outcome === 'win',
      amount: outcome === 'win' ? payout : betAmount,
      balance: user.balance
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
