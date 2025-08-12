// server/utils/withNotification.js
const { pushNotification } = require('./notify')

/**
 * Wrap controller để tự động push notification khi payload có { win, amount }
 * Response được gửi ngay, notification emit sau 2s
 */
function withNotification(controller, gameName) {
  return async (req, res, next) => {
    // giữ lại phương thức json gốc
    const originalJson = res.json.bind(res)

    // override
    res.json = (payload) => {
      // 1) gửi response cho client ngay
      originalJson(payload)

      // 2) nếu đúng shape, schedule notification sau 2s
      if (
        payload &&
        typeof payload.win === 'boolean' &&
        typeof payload.amount === 'number'
      ) {
        const type    = payload.win ? 'game_win' : 'game_loss'
        const message = payload.win
          ? `You won ${payload.amount} on ${gameName}`
          : `You lost ${payload.amount} on ${gameName}`

        setTimeout(() => {
          pushNotification(req.app, req.user.id, type, message)
            .catch(err => console.error('Notification error:', err))
        }, 2000)
      }
    }

    // gọi controller gốc
    return controller(req, res, next)
  }
}

module.exports = withNotification
