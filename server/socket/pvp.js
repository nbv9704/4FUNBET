// server/socket/pvp.js
module.exports = function registerPvpSocket(io) {
  io.on('connection', (socket) => {
    // Subscribe to a room channel to receive detailed updates
    socket.on('pvp:joinRoomChannel', (roomId) => {
      if (typeof roomId === 'string' && roomId.length) {
        socket.join(`pvp:${roomId}`)
      }
    })

    socket.on('pvp:leaveRoomChannel', (roomId) => {
      if (typeof roomId === 'string' && roomId.length) {
        socket.leave(`pvp:${roomId}`)
      }
    })

    // Optional list refresh trigger
    socket.on('pvp:list', () => {
      io.emit('pvp:rooms:refresh')
    })
  })
}
