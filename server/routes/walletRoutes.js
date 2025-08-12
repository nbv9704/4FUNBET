// server/routes/walletRoutes.js
const express      = require('express')
const router       = express.Router()
const auth         = require('../middleware/auth')
const User         = require('../models/User')
const Transaction  = require('../models/Transaction')
const Notification = require('../models/Notification')

// Helper: create & emit notification
async function pushNotification(req, userId, type, message) {
  const notif = await Notification.create({ userId, type, message })
  const io = req.app.get('io')
  const onlineUsers = req.app.get('onlineUsers')
  const sockets = onlineUsers[userId] || []
  sockets.forEach(socketId => {
    io.to(socketId).emit('notification', notif)
  })
}

// POST /api/wallet/:id/bank/deposit
router.post('/:id/bank/deposit', auth, async (req, res) => {
  try {
    const { amount } = req.body
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    user.balance -= amount
    user.bank += amount
    await user.save()

    await Transaction.create({
      userId:    user._id,
      type:      'deposit',
      amount,
      createdAt: new Date()
    })

    await pushNotification(
      req,
      user._id,
      'deposit',
      `You deposited ${amount} from Account to Bank`
    )

    res.json({ balance: user.balance, bank: user.bank })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/wallet/:id/bank/withdraw
router.post('/:id/bank/withdraw', auth, async (req, res) => {
  try {
    const { amount } = req.body
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.bank < amount) {
      return res.status(400).json({ error: 'Insufficient bank balance' })
    }

    user.bank -= amount
    user.balance += amount
    await user.save()

    await Transaction.create({
      userId:    user._id,
      type:      'withdraw',
      amount,
      createdAt: new Date()
    })

    await pushNotification(
      req,
      user._id,
      'withdraw',
      `You withdrew ${amount} from Bank to Account`
    )

    res.json({ balance: user.balance, bank: user.bank })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/wallet/:id/transfer
router.post('/:id/transfer', auth, async (req, res) => {
  try {
    const { toUserId, amount } = req.body
    if (!toUserId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid transfer data' })
    }

    const fromUser = await User.findById(req.params.id)
    const toUser   = await User.findById(toUserId)
    if (!fromUser || !toUser) {
      return res.status(404).json({ error: 'User not found' })
    }
    if (fromUser.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    fromUser.balance -= amount
    toUser.balance   += amount
    await fromUser.save()
    await toUser.save()

    await Transaction.create({
      userId:    fromUser._id,
      type:      'transfer',
      amount,
      toUserId:  toUser._id,
      createdAt: new Date()
    })
    await Transaction.create({
      userId:      toUser._id,
      type:        'transfer',
      amount,
      fromUserId:  fromUser._id,
      createdAt:   new Date()
    })

    await pushNotification(
      req,
      fromUser._id,
      'transfer_sent',
      `You transferred ${amount} to ${toUser.username}`
    )
    await pushNotification(
      req,
      toUser._id,
      'transfer_received',
      `You received ${amount} from ${fromUser.username}`
    )

    res.json({ fromBalance: fromUser.balance, toBalance: toUser.balance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/wallet/:id/transactions
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const userId = req.params.id
    const txs = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .lean()
    return res.json({ transactions: txs })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
