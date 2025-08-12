// server/controllers/minigames/blackjackDiceController.js
const User = require('../../models/User')
const { randomInt } = require('../../utils/random')
const { recordGameHistory } = require('../../utils/history')

// Lưu state cho mỗi user; production nên dùng Redis hoặc DB
const blackjackGames = new Map()

/**
 * POST /api/game/blackjackdice/start
 * Body: { betAmount: number }
 */
exports.startBlackjackDice = async (req, res) => {
  const userId = req.user.id
  const { betAmount } = req.body

  // Không cho start khi ván đang chạy
  if (blackjackGames.has(userId)) {
    return res.status(400).json({ error: 'A Blackjack Dice game is already in progress' })
  }

  // Validate betAmount
  if (typeof betAmount !== 'number' || betAmount <= 0) {
    return res.status(400).json({ error: 'Invalid betAmount' })
  }

  // Load user & check balance
  const user = await User.findById(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.balance < betAmount) {
    return res.status(400).json({ error: 'Insufficient balance' })
  }

  // Trừ stake
  user.balance -= betAmount
  await user.save()

  // Roll 2 dice cho player và dealer
  const playerDice = [randomInt(1, 6), randomInt(1, 6)]
  const dealerDice = [randomInt(1, 6), randomInt(1, 6)]
  const state = {
    betAmount,
    playerDice,
    dealerDice,
    playerSum: playerDice.reduce((a, b) => a + b, 0),
    dealerSum: dealerDice.reduce((a, b) => a + b, 0),
    isActive: true
  }
  blackjackGames.set(userId, state)

  return res.json({
    playerDice,
    playerSum: state.playerSum,
    dealerVisible: [dealerDice[0], null],
    balance: user.balance
  })
}

/**
 * POST /api/game/blackjackdice/hit
 */
exports.hitBlackjackDice = async (req, res) => {
  const userId = req.user.id
  const state = blackjackGames.get(userId)
  if (!state || !state.isActive) {
    return res.status(400).json({ error: 'No active game. Call /blackjackdice/start first.' })
  }

  const newDie = randomInt(1, 6)
  state.playerDice.push(newDie)
  state.playerSum += newDie

  // Check bust (kết thúc ván -> thêm win/amount để bắn notification)
  if (state.playerSum > 21) {
    blackjackGames.delete(userId)
    const user = await User.findById(userId)

    await recordGameHistory({
      userId,
      game: 'blackjackdice',
      betAmount: state.betAmount,
      outcome: 'lose',
      payout: 0
    })

    return res.json({
      playerDice: state.playerDice,
      playerSum: state.playerSum,
      dealerDice: state.dealerDice,
      dealerSum: state.dealerSum,
      outcome: 'lose',
      payout: 0,
      win: false,              // chỉ set khi kết thúc ván
      amount: state.betAmount, // số tiền người chơi đã thua
      balance: user.balance
    })
  }

  const user = await User.findById(userId)
  return res.json({
    playerDice: state.playerDice,
    playerSum: state.playerSum,
    dealerVisible: [state.dealerDice[0], null],
    balance: user.balance
  })
}

/**
 * POST /api/game/blackjackdice/stand
 */
exports.standBlackjackDice = async (req, res) => {
  const userId = req.user.id
  const state = blackjackGames.get(userId)
  if (!state || !state.isActive) {
    return res.status(400).json({ error: 'No active game. Call /blackjackdice/start first.' })
  }

  const user = await User.findById(userId)

  let dealerSum = state.dealerSum
  while (dealerSum < state.playerSum && dealerSum <= 21) {
    const d = randomInt(1, 6)
    state.dealerDice.push(d)
    dealerSum += d
  }

  let outcome, payout
  if (dealerSum > 21) {
    outcome = 'win'
    payout  = state.betAmount * 2
    user.balance += payout
  } else if (dealerSum > state.playerSum) {
    outcome = 'lose'
    payout  = 0
  } else {
    outcome = 'tie'
    payout  = state.betAmount
    user.balance += payout
  }

  await user.save()
  blackjackGames.delete(userId)

  await recordGameHistory({
    userId,
    game: 'blackjackdice',
    betAmount: state.betAmount,
    outcome,
    payout
  })

  // Chỉ thêm win/amount khi KHÔNG phải tie (tránh bắn "loss" nhầm)
  const response = {
    playerDice: state.playerDice,
    playerSum: state.playerSum,
    dealerDice: state.dealerDice,
    dealerSum,
    outcome,
    payout,
    balance: user.balance
  }

  if (outcome === 'win') {
    response.win = true
    response.amount = payout          // số tiền thắng thực tế
  } else if (outcome === 'lose') {
    response.win = false
    response.amount = state.betAmount // số tiền đã thua
  }
  // outcome === 'tie' -> KHÔNG set win/amount để wrapper bỏ qua

  return res.json(response)
}

/**
 * POST /api/game/blackjackdice/check
 */
exports.checkBlackjackDice = async (req, res) => {
  const userId = req.user.id
  const state = blackjackGames.get(userId)
  if (!state || !state.isActive) {
    return res.json({ active: false })
  }
  return res.json({
    active: true,
    state: {
      playerDice: state.playerDice,
      playerSum: state.playerSum,
      dealerVisible: [state.dealerDice[0], null],
      balance: (await User.findById(userId)).balance
    }
  })
}

/**
 * POST /api/game/blackjackdice/abandon
 */
exports.abandonBlackjackDice = async (req, res) => {
  const userId = req.user.id
  const state = blackjackGames.get(userId)

  if (!state || !state.isActive) {
    return res.status(400).json({ error: 'No active game to abandon' })
  }

  blackjackGames.delete(userId)
  return res.json({ message: 'Game abandoned successfully' })
}

/**
 * POST /api/game/blackjackdice/resume
 */
exports.resumeBlackjackDice = async (req, res) => {
  const userId = req.user.id
  const state = blackjackGames.get(userId)

  if (!state || !state.isActive) {
    return res.status(400).json({ error: 'No active game to resume' })
  }

  return res.json({
    playerDice: state.playerDice,
    playerSum: state.playerSum,
    dealerVisible: [state.dealerDice[0], null],
    balance: (await User.findById(userId)).balance
  })
}
