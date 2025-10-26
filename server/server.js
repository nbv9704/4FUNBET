// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitizeCustom = require('./middleware/mongoSanitize');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const historyRoutes = require('./routes/historyRoutes');
const walletRoutes = require('./routes/walletRoutes');
const gameRoutes = require('./routes/gameRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const pvpRoutes = require('./routes/pvpRoutes');
const registerPvpSocket = require('./socket/pvp');
const { router: adminPvpRouter } = require('./routes/adminPvpRoutes');
const { schedulePvpCleanup, stopPvpCleanup } = require('./cron/cleanupRooms');

// ✅ Import middleware
const logRequest = require('./middleware/logRequest');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');

const PvpRoom = require('./models/PvpRoom');

const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');

// CORS whitelist
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', process.env.CLIENT_URL, process.env.FRONTEND_URL].filter(Boolean);

const io = new Server(http, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

const onlineUsers = {};

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    onlineUsers[userId] ||= [];
    onlineUsers[userId].push(socket.id);
  });

  socket.on('disconnect', () => {
    for (const [uid, sockets] of Object.entries(onlineUsers)) {
      onlineUsers[uid] = sockets.filter((id) => id !== socket.id);
      if (onlineUsers[uid].length === 0) delete onlineUsers[uid];
    }
  });
});

registerPvpSocket(io);

app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:3001'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key', 'x-client-now', 'x-request-id'],
    credentials: true,
  })
);

// ✅ Request size limits
app.use(express.json({ limit: '1mb' }));

// ✅ Sanitize MongoDB queries
app.use(mongoSanitizeCustom());

// ✅ RequestId middleware (always runs)
app.use(requestId);

// ✅ HTTP logger
app.use(logRequest);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/user', historyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/pvp', pvpRoutes);
app.use('/api/admin/pvp', adminPvpRouter);

app.get('/', (req, res) => {
  res.send('Cado4fun backend running!');
});

// ✅ Ensure PvP indexes
async function ensurePvpIndexes() {
  const coll = PvpRoom.collection;
  try {
    const existing = await coll.indexes();

    // Drop old roomId_1 index if exists
    for (const idx of existing) {
      if (idx.name === 'roomId_1' && idx.key && idx.key.roomId === 1) {
        try {
          await coll.dropIndex('roomId_1');
          console.log('✅ Dropped old roomId_1 index');
        } catch (e) {
          // Ignore if already dropped
        }
        break;
      }
    }

    const has = (keySpec, { unique } = {}) => {
      const keyJson = JSON.stringify(keySpec);
      return existing.some((ix) => {
        if (JSON.stringify(ix.key) !== keyJson) return false;
        if (unique != null && !!ix.unique !== !!unique) return false;
        return true;
      });
    };

    const createIfMissing = async (keySpec, options = {}) => {
      if (has(keySpec, { unique: options.unique })) return;
      try {
        await coll.createIndex(keySpec, options);
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (msg.includes('already exists with a different name') || msg.includes('IndexOptionsConflict') || e?.code === 85 || e?.code === 11000) {
          return;
        }
        throw e;
      }
    };

    await createIfMissing({ status: 1, game: 1, 'metadata.pendingCoin.revealAt': 1 }, { name: 'pvp_coinflip_pending_revealAt' });
    await createIfMissing({ status: 1, game: 1, 'metadata.pending.advanceAt': 1 }, { name: 'pvp_dice_pending_advanceAt' });
    await createIfMissing({ status: 1, updatedAt: 1 }, { name: 'pvp_status_updatedAt' });
    await createIfMissing({ roomId: 1 }, { unique: true, name: 'pvp_roomId_unique' });
  } catch (e) {
    console.error('ensurePvpIndexes error:', e?.message || e);
  }
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await ensurePvpIndexes();
  })
  .catch((err) => console.error('MongoDB error:', err));

// Schedule PvP cleanup
schedulePvpCleanup(app);

// ✅ Error handler MUST be last
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
async function shutdown(signal) {
  try {
    console.log(`[${signal}] Shutting down...`);
    stopPvpCleanup();
    io.close(() => console.log('Socket.IO closed'));
    await mongoose.connection.close(false);
    http.close?.(() => console.log('HTTP server closed'));
  } catch (e) {
    console.error('Error during shutdown:', e);
  } finally {
    process.exit(0);
  }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));