// server/routes/pvpRoutes.js
const express  = require('express');
const PvpRoom  = require('../models/PvpRoom');
const Notification = require('../models/Notification');
const User     = require('../models/User');
const auth     = require('../middleware/auth');

const router = express.Router();
const getIO = (req) => req.app.get('io');
const getOnline = (req) => req.app.get('onlineUsers') || {};

/** ---------- helpers ---------- */
const ALPHANUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateShortId(len = 5) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHANUM.charAt(Math.floor(Math.random() * ALPHANUM.length));
  }
  return out;
}
async function generateUniqueRoomId() {
  // avoid collision with any active/waiting room
  // (finished rooms won't block reuse)
  let id;
  // small upper bound to avoid infinite loop in extreme case
  for (let i = 0; i < 200; i++) {
    id = generateShortId(5);
    const exists = await PvpRoom.exists({
      roomId: id,
      status: { $in: ['waiting', 'active'] },
    });
    if (!exists) return id;
  }
  // fallback: last generated (very unlikely to collide after many tries)
  return id || generateShortId(5);
}

/** ---------- LIST / DETAIL ---------- */
// GET /api/pvp/rooms?game=coinflip
router.get('/rooms', async (req, res) => {
  try {
    const q = { status: { $in: ['waiting', 'active'] } };
    if (req.query.game) q.game = String(req.query.game);
    const rooms = await PvpRoom.find(q).sort({ createdAt: -1 }).limit(200);
    res.json(rooms);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/pvp/:roomId  (populate player display info)
router.get('/:roomId', async (req, res) => {
  try {
    const doc = await PvpRoom.findOne({ roomId: req.params.roomId })
      .populate('players.userId', 'username name avatar avatarUrl')
      .lean();
    if (!doc) return res.status(404).json({ error: 'Room not found' });

    // enrich players with user display (username + avatar)
    const players = (doc.players || []).map((p) => {
      const u = p.userId && typeof p.userId === 'object' ? p.userId : null;
      return {
        userId: u?._id || p.userId,     // keep original for compatibility
        ready: p.ready,
        joinedAt: p.joinedAt,
        user: u
          ? {
              id: String(u._id),
              username: u.username || u.name || 'Unknown',
              avatar: u.avatar || u.avatarUrl || null,
            }
          : null,
      };
    });

    res.json({ ...doc, players });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** ---------- CREATE / JOIN / READY / START ---------- */
// POST /api/pvp/create
router.post('/create', auth, async (req, res) => {
  try {
    const { game = 'coinflip' } = req.body || {};
    let   { maxPlayers = 2, betAmount = 0 } = req.body || {};
    maxPlayers = Math.max(2, Math.min(6, Number(maxPlayers) || 2));
    betAmount  = Math.max(0, Number(betAmount) || 0);

    const roomId = await generateUniqueRoomId();

    const room = await PvpRoom.create({
      roomId,
      game,
      betAmount,
      maxPlayers,
      players: [{ userId: req.user.id, ready: false }],
      createdBy: req.user.id,
    });

    const io = getIO(req);
    io?.emit('pvp:roomCreated', {
      roomId: room.roomId,
      game: room.game,
      betAmount: room.betAmount,
      maxPlayers: room.maxPlayers,
      players: room.players,
      status: room.status,
      createdAt: room.createdAt,
    });

    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// helper reused by /:roomId/join and /join/:roomId
async function joinRoomHandler(req, res) {
  try {
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status !== 'waiting') return res.status(400).json({ error: 'Room is not joinable' });

    const uid = String(req.user.id);
    const already = room.players.some(p => String(p.userId) === uid);
    if (!already) {
      if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Room is full' });
      room.players.push({ userId: req.user.id, ready: false });
      await room.save();
    }

    const io = getIO(req);
    io?.emit('pvp:roomUpdated', { roomId: room.roomId });
    io?.to(`pvp:${room.roomId}`).emit('pvp:roomUpdated', room);

    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// POST /api/pvp/:roomId/join
router.post('/:roomId/join', auth, joinRoomHandler);

// Alias: POST /api/pvp/join/:roomId
router.post('/join/:roomId', auth, joinRoomHandler);

// POST /api/pvp/:roomId/ready
router.post('/:roomId/ready', auth, async (req, res) => {
  try {
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!['waiting','active'].includes(room.status)) {
      return res.status(400).json({ error: 'Room not in a ready-able state' });
    }

    const uid = String(req.user.id);
    const player = room.players.find(p => String(p.userId) === uid);
    if (!player) return res.status(403).json({ error: 'You are not in this room' });

    const desired = typeof req.body?.ready === 'boolean' ? req.body.ready : true;
    player.ready = desired;

    await room.save();

    const io = getIO(req);
    io?.emit('pvp:roomUpdated', { roomId: room.roomId });
    io?.to(`pvp:${room.roomId}`).emit('pvp:roomUpdated', room);

    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/pvp/:roomId/start
// New rule: only ALL non-owners must be ready; owner does not need to be ready
router.post('/:roomId/start', auth, async (req, res) => {
  try {
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (String(room.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only owner can start' });
    }
    if (!['waiting','active'].includes(room.status)) {
      return res.status(400).json({ error: 'Room cannot be started' });
    }
    if (room.players.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players' });
    }

    const nonOwners = room.players.filter(p => String(p.userId) !== String(room.createdBy));
    if (nonOwners.length === 0 || !nonOwners.every(p => p.ready)) {
      return res.status(400).json({ error: 'All participants must be ready' });
    }

    room.status = 'active';
    await room.save();

    const io = getIO(req);
    io?.emit('pvp:roomStarted', { roomId: room.roomId });
    io?.to(`pvp:${room.roomId}`).emit('pvp:roomStarted', room);
    io?.emit('pvp:roomUpdated', { roomId: room.roomId });

    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** ---------- BET / FINISH ---------- */
router.post('/:roomId/bet', auth, async (req, res) => {
  try {
    const { amount, choice } = req.body || {};
    if (!(Number(amount) > 0)) return res.status(400).json({ error: 'Invalid amount' });

    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status !== 'active') return res.status(400).json({ error: 'Room is not active' });

    const uid = String(req.user.id);
    const inRoom = room.players.some(p => String(p.userId) === uid);
    if (!inRoom) return res.status(403).json({ error: 'You are not in this room' });

    room.bets.push({ userId: req.user.id, amount: Number(amount), choice });
    await room.save();

    getIO(req)?.to(`pvp:${room.roomId}`).emit('pvp:roomUpdated', room);
    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:roomId/finish', auth, async (req, res) => {
  try {
    const { winnerUserId, metadata } = req.body || {};
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status === 'finished') return res.json(room);

    room.winnerUserId = winnerUserId || null;
    room.status = 'finished';
    if (metadata) room.metadata = { ...(room.metadata || {}), ...metadata };
    await room.save();

    const io = getIO(req);
    io?.emit('pvp:roomFinished', { roomId: room.roomId });
    io?.to(`pvp:${room.roomId}`).emit('pvp:roomFinished', room);

    res.json(room);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** ---------- LEAVE / DELETE ---------- */
// POST /api/pvp/:roomId/leave
router.post('/:roomId/leave', auth, async (req, res) => {
  try {
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const uid = String(req.user.id);
    if (String(room.createdBy) === uid) {
      return res.status(400).json({ error: 'Owner cannot leave. Use delete instead.' });
    }

    const before = room.players.length;
    room.players = room.players.filter(p => String(p.userId) !== uid);
    if (room.players.length === before) {
      return res.status(400).json({ error: 'You are not in this room' });
    }

    if (room.players.length === 0) {
      await PvpRoom.deleteOne({ _id: room._id });
      getIO(req)?.emit('pvp:roomDeleted', { roomId: room.roomId });
      return res.json({ ok: true, deleted: true });
    }

    if (room.status === 'active' && room.players.length < 2) {
      room.status = 'waiting';
      room.players.forEach(p => (p.ready = false));
    }

    await room.save();
    const io = getIO(req);
    io?.emit('pvp:roomUpdated', { roomId: room.roomId });
    io?.to(`pvp:${room.roomId}`).emit('pvp:roomUpdated', room);

    res.json({ ok: true, room });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/pvp/:roomId
router.delete('/:roomId', auth, async (req, res) => {
  try {
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (String(room.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only owner can delete' });
    }
    if (room.status !== 'waiting') {
      return res.status(400).json({ error: 'Can delete only when waiting' });
    }

    await PvpRoom.deleteOne({ _id: room._id });
    const io = getIO(req);
    io?.emit('pvp:roomDeleted', { roomId: room.roomId });
    io?.to(`pvp:${room.roomId}`).emit('pvp:roomDeleted', { roomId: room.roomId });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** ---------- INVITE (persist + realtime + deeplink) ---------- */
// POST /api/pvp/:roomId/invite  { targetUserId }
router.post('/:roomId/invite', auth, async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });

    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isMember = room.players.some(p => String(p.userId) === String(req.user.id)) ||
                     String(room.createdBy) === String(req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Only members can invite' });

    // Get inviter's display name from DB (fallbacks)
    const inviter = await User.findById(req.user.id).select('username name email').lean();
    const fromUserName = inviter?.username || inviter?.name || inviter?.email || 'Unknown';

    // Persist Notification with deeplink + sender info
    const path = `/game/battle/room/${room.roomId}`;
    const notif = await Notification.create({
      userId: targetUserId,
      type: 'pvp_invite',
      message: `Invitation from ${fromUserName} to join a ${room.game} room`,
      read: false,
      link: path,
      metadata: {
        roomId: room.roomId,
        game: room.game,
        betAmount: room.betAmount,
        fromUserId: String(req.user.id),
        fromUserName,
        path,
      },
    });

    // Realtime push
    const io = getIO(req);
    const sockets = (getOnline(req)[String(targetUserId)] || []);
    const payload = {
      _id: String(notif._id),
      userId: String(targetUserId),
      type: notif.type,
      message: notif.message,
      read: false,
      createdAt: notif.createdAt,
      link: notif.link,
      metadata: notif.metadata,
    };
    sockets.forEach((sid) => io?.to(sid).emit('notification', payload));
    io?.to(sockets).emit?.('pvp:invite', payload); // optional

    res.json({ ok: true, delivered: sockets.length, notificationId: String(notif._id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
