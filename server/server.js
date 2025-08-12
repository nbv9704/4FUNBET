// server.js
const express      = require('express')
const mongoose     = require('mongoose')
const cors         = require('cors')
require('dotenv').config()

const authRoutes         = require('./routes/authRoutes')
const userRoutes         = require('./routes/userRoutes')
const historyRoutes      = require('./routes/historyRoutes')
const walletRoutes       = require('./routes/walletRoutes')
const gameRoutes         = require('./routes/gameRoutes')
const rewardRoutes       = require('./routes/rewardRoutes')
const notificationRoutes = require('./routes/notificationRoutes')

// ⬇️ New: PvP
const pvpRoutes          = require('./routes/pvpRoutes')
const registerPvpSocket  = require('./socket/pvp')

const app    = express()
const http   = require('http').createServer(app)
const { Server } = require('socket.io')
const io     = new Server(http, {
  cors: {
    origin: '*',
    methods: ['GET','POST','PATCH','DELETE','OPTIONS']
  }
})

// map userId -> [socketId,...]
const onlineUsers = {}

io.on('connection', socket => {
  socket.on('register', userId => {
    onlineUsers[userId] ||= []
    onlineUsers[userId].push(socket.id)
  })

  socket.on('disconnect', () => {
    for (const [uid, sockets] of Object.entries(onlineUsers)) {
      onlineUsers[uid] = sockets.filter(id => id !== socket.id)
      if (onlineUsers[uid].length === 0) delete onlineUsers[uid]
    }
  })
})

// ⬇️ New: register PvP socket channels
registerPvpSocket(io)

app.set('io', io)
app.set('onlineUsers', onlineUsers)

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}))
app.use(express.json())

app.use('/api/auth',   authRoutes)
app.use('/api/user',   historyRoutes)
app.use('/api/user',   userRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/game',   gameRoutes)
app.use('/api/rewards', rewardRoutes)
app.use('/api/notification', notificationRoutes)

// ⬇️ New: mount PvP API under /api/pvp
app.use('/api/pvp', pvpRoutes)

app.get('/', (req, res) => {
  res.send('Cado4fun backend running!')
})

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err))

const PORT = process.env.PORT || 3001
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
