// server/routes/notificationRoutes.js
const express      = require('express')
const router       = express.Router()
const auth         = require('../middleware/auth')
const Notification = require('../models/Notification')

// GET /api/notification?limit=10
router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const notifs = await Notification
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
    res.json({ notifications: notifs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/notification/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    )
    if (!notif) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
