// server/utils/notify.js
const Notification = require('../models/Notification')

/**
 * Lưu notification vào DB và emit real-time qua socket.io
 * @param {Express.App} app  – your express app instance
 * @param {String} userId    – Mongo _id của user
 * @param {String} type      – notification type
 * @param {String} message   – nội dung thông báo
 */
async function pushNotification(app, userId, type, message) {
  // 1. Lưu DB
  const notif = await Notification.create({ userId, type, message })

  // 2. Emit real-time
  const io = app.get('io')
  const onlineUsers = app.get('onlineUsers') || {}
  const sockets = onlineUsers[userId] || []
  sockets.forEach(socketId => {
    io.to(socketId).emit('notification', notif)
  })
}

module.exports = { pushNotification }
