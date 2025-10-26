// server/routes/pvpRoutes.js
const express  = require('express');
const mongoose = require('mongoose');
const PvpRoom  = require('../models/PvpRoom');
const Notification = require('../models/Notification');
const User     = require('../models/User');
const auth     = require('../middleware/auth');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/ErrorCodes');

const { makeServerSeed, sha256, coinflip, hmacHex } = require('../utils/fair');
const { logBalanceChange } = require('../utils/balanceLog');
const asyncHandler = require('../middleware/asyncHandler');
const validateRequest = require('../middleware/validateRequest');

// ✅ Import validation schemas
const {
  createRoomSchema,
  joinRoomSchema,
  readySchema,
  startRoomSchema,
  rollDiceSchema,
  placeBetSchema,
  finishRoomSchema,
  inviteSchema,
} = require('../validation/pvpSchemas');

// ✅ Import strict rate limiters
const { pvpActionLimiter, createRoomLimiter } = require('../middleware/rateLimitStrict');
const idem = require('../middleware/idempotency');

const router = express.Router();
const getIO = (req) => req.app.get('io');
const getOnline = (req) => req.app.get('onlineUsers') || {};

// ===== Constants =====
const ROLL_REVEAL_MS = 3000;
const HOLD_AFTER_REVEAL_MS = 3000;

// ✅ Rate limit entire router (lighter limit)
router.use(pvpActionLimiter);

// ===== Helpers (unchanged) =====
const ALPHANUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateShortId(len = 5) {
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHANUM.charAt(Math.floor(Math.random() * ALPHANUM.length));
  return out;
}
async function generateUniqueRoomId() {
  let id;
  for (let i = 0; i < 200; i++) {
    id = generateShortId(5);
    const exists = await PvpRoom.exists({ roomId: id, status: { $in: ['waiting', 'active'] } });
    if (!exists) return id;
  }
  return id || generateShortId(5);
}
const otherSide = (s) => (s === 'heads' ? 'tails' : 'heads');

function hexToFloat01(hex) {
  const n = parseInt(hex.slice(0, 8), 16);
  return n / 0x100000000;
}

function emitRoomEvent(io, roomId, event, payload) {
  io?.to(`pvp:${roomId}`).emit(event, payload);
}

function sanitizeRoomWithNow(doc) {
  if (!doc) return doc;
  const room = JSON.parse(JSON.stringify(doc));
  if (room?.metadata && room.status !== 'finished') {
    delete room.metadata.serverSeed;
  }
  const md = room.metadata || {};
  if (md?.pendingCoin?.revealAt && !md._revealAt) md._revealAt = md.pendingCoin.revealAt;
  if (md?.pending?.revealAt && !md._revealAt) md._revealAt = md.pending.revealAt;
  if (md?.pending?.advanceAt && !md.turnLockedUntil) md.turnLockedUntil = md.pending.advanceAt;

  room.serverNow = Date.now();
  return room;
}

function ensureIdem(md) {
  md.idempotency = md.idempotency || { start: [], roll: [], finish: [] };
  return md.idempotency;
}
function seenIdem(md, type, id) {
  if (!id) return false;
  const idem = ensureIdem(md);
  return idem[type]?.includes(id);
}
function markIdem(md, type, id, cap = 100) {
  if (!id) return;
  const idem = ensureIdem(md);
  idem[type] = Array.isArray(idem[type]) ? idem[type] : [];
  if (!idem[type].includes(id)) {
    idem[type].push(id);
    if (idem[type].length > cap) idem[type].shift();
  }
}

// ---------- CONSTANTS ----------
router.get('/constants', (req, res) => {
  return res.json({
    REVEAL_MS: ROLL_REVEAL_MS,
    NEXT_TURN_DELAY: HOLD_AFTER_REVEAL_MS,
    serverNow: Date.now(),
  });
});

// ---------- LIST / DETAIL ----------
router.get('/rooms', asyncHandler(async (req, res) => {
  const q = { status: { $in: ['waiting', 'active'] } };
  if (req.query.game) q.game = String(req.query.game);
  const rooms = await PvpRoom.find(q).sort({ createdAt: -1 }).limit(200).lean();
  const out = rooms.map((r) => sanitizeRoomWithNow(r));
  res.json(out);
}));

router.get('/:roomId', asyncHandler(async (req, res) => {
  const doc = await PvpRoom.findOne({ roomId: req.params.roomId })
    .populate('players.userId', 'username name avatar avatarUrl')
    .lean();
  if (!doc) {
    throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng', { roomId: req.params.roomId });
  }

  const players = (doc.players || []).map((p) => {
    const u = p.userId && typeof p.userId === 'object' ? p.userId : null;
    return {
      userId: u?._id || p.userId,
      ready: p.ready,
      side: p.side || null,
      joinedAt: p.joinedAt,
      user: u ? { id: String(u._id), username: u.username || u.name || 'Unknown', avatar: u.avatar || u.avatarUrl || null } : null,
    };
  });

  res.json(sanitizeRoomWithNow({ ...doc, players }));
}));

// ---------- CREATE ----------
router.post(
  '/create',
  auth,
  createRoomLimiter, // ✅ Apply strict rate limit
  validateRequest(createRoomSchema, 'body'), // ✅ Validate input
  asyncHandler(async (req, res) => {
    const { game, maxPlayers, betAmount, hostSide, diceSides } = req.body;

    // Validate balance
    if (betAmount > 0) {
      const creator = await User.findById(req.user.id).select('balance');
      if (!creator) throw new AppError(ErrorCodes.USER_NOT_FOUND, 404, 'Không tìm thấy người dùng');
      if (creator.balance < betAmount) {
        throw new AppError(
          ErrorCodes.INSUFFICIENT_BALANCE,
          402,
          `Số dư không đủ\nSố dư cần để thực hiện: ${betAmount}`,
          { required: betAmount, have: creator.balance }
        );
      }
    }

    const roomId = await generateUniqueRoomId();
    const serverSeed = makeServerSeed();
    const serverSeedHash = sha256(serverSeed);

    const baseMeta = {
      serverSeedHash,
      serverSeed,
      clientSeed: roomId,
      nonce: 0,
      escrowed: false,
    };

    if (game === 'dice') {
      baseMeta.dice = { sides: diceSides || 6, rolls: [], result: null };
    }

    const room = await PvpRoom.create({
      roomId,
      game,
      betAmount,
      maxPlayers,
      players: [{ userId: req.user.id, ready: false, side: game === 'coinflip' ? (hostSide || null) : null }],
      createdBy: req.user.id,
      metadata: baseMeta,
    });

    const io = getIO(req);
    io?.emit('pvp:roomCreated', { room: sanitizeRoomWithNow(room), serverNow: Date.now() });

    res.json(sanitizeRoomWithNow(room));
  })
);

// ---------- JOIN ----------
const joinRoomHandler = asyncHandler(async (req, res) => {
  const room = await PvpRoom.findOne({ roomId: req.params.roomId });
  if (!room) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');
  if (room.status !== 'waiting') throw new AppError(ErrorCodes.PVP_ROOM_NOT_JOINABLE, 409, 'Phòng không thể tham gia');

  const uid = String(req.user.id);
  let player = room.players.find((p) => String(p.userId) === uid);

  if (!player) {
    if (room.players.length >= room.maxPlayers) throw new AppError(ErrorCodes.PVP_ROOM_FULL, 409, 'Phòng đã đầy');

    const bet = Number(room.betAmount || 0);
    if (bet > 0) {
      const u = await User.findById(uid).select('balance');
      if (!u) throw new AppError(ErrorCodes.USER_NOT_FOUND, 404, 'Không tìm thấy người dùng');
      if (u.balance < bet) {
        throw new AppError(ErrorCodes.INSUFFICIENT_BALANCE, 402, `Số dư không đủ\nSố dư cần: ${bet}`, { required: bet, have: u.balance });
      }
    }

    let side = null;
    if (room.game === 'coinflip') {
      const existingSides = room.players.map((p) => p.side).filter(Boolean);
      if (existingSides.includes('heads') && !existingSides.includes('tails')) side = 'tails';
      else if (existingSides.includes('tails') && !existingSides.includes('heads')) side = 'heads';
    }

    player = { userId: req.user.id, ready: false, side };
    room.players.push(player);
    await room.save();
  }

  const io = getIO(req);
  emitRoomEvent(io, room.roomId, 'pvp:roomUpdated', { room: sanitizeRoomWithNow(room), serverNow: Date.now() });
  res.json(sanitizeRoomWithNow(room));
});

router.post('/:roomId/join', auth, validateRequest(joinRoomSchema, 'body'), joinRoomHandler);
router.post('/join/:roomId', auth, validateRequest(joinRoomSchema, 'body'), joinRoomHandler);

// ---------- READY ----------
router.post(
  '/:roomId/ready',
  auth,
  validateRequest(readySchema, 'body'),
  asyncHandler(async (req, res) => {
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');
    if (!['waiting', 'active'].includes(room.status)) {
      throw new AppError(ErrorCodes.PVP_ROOM_NOT_READYABLE, 409, 'Phòng không ở trạng thái có thể ready');
    }

    const uid = String(req.user.id);
    const player = room.players.find((p) => String(p.userId) === uid);
    if (!player) throw new AppError(ErrorCodes.PVP_NOT_MEMBER, 403, 'Bạn không ở trong phòng này');

    player.ready = req.body.ready;
    await room.save();

    const io = getIO(req);
    emitRoomEvent(io, room.roomId, 'pvp:roomUpdated', { room: sanitizeRoomWithNow(room), serverNow: Date.now() });
    res.json(sanitizeRoomWithNow(room));
  })
);

// ---------- START (idempotent) ----------
router.post(
  '/:roomId/start',
  auth,
  pvpActionLimiter,
  idem({ ttlMs: 120_000, namespace: 'pvp:start' }),
  validateRequest(startRoomSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { requestId } = req.body;
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');

    const md = room.metadata || {};
    if (requestId && seenIdem(md, 'start', requestId)) {
      return res.json(sanitizeRoomWithNow(room));
    }

    if (String(room.createdBy) !== String(req.user.id)) {
      throw new AppError(ErrorCodes.PVP_ONLY_OWNER, 403, 'Chỉ chủ phòng mới có thể bắt đầu');
    }
    if (room.status !== 'waiting') {
      if (requestId) {
        markIdem(md, 'start', requestId);
        room.metadata = md;
        room.markModified('metadata');
        await room.save();
      }
      return res.json(sanitizeRoomWithNow(room));
    }
    if (room.players.length < 2) {
      throw new AppError(ErrorCodes.PVP_NEED_AT_LEAST_2_PLAYERS, 409, 'Cần ít nhất 2 người chơi');
    }
    const nonOwners = room.players.filter((p) => String(p.userId) !== String(room.createdBy));
    if (nonOwners.length === 0 || !nonOwners.every((p) => p.ready)) {
      throw new AppError(ErrorCodes.PVP_ALL_PARTICIPANTS_MUST_READY, 409, 'Tất cả người chơi phải ready');
    }

    const bet = Number(room.betAmount || 0);
    if (bet < 0) throw new AppError(ErrorCodes.INVALID_AMOUNT, 400, 'Số tiền cược không hợp lệ');

    const playerIds = room.players.map((p) => String(p.userId));

    if (requestId) markIdem(md, 'start', requestId);

    // ESCROW
    if (md.escrowed !== true) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const users = await User.find({ _id: { $in: playerIds } })
            .session(session)
            .select('balance');
          const byId = new Map(users.map((u) => [String(u._id), u]));
          for (const pid of playerIds) {
            const u = byId.get(pid);
            if (!u || u.balance < bet) {
              throw new AppError(
                ErrorCodes.INSUFFICIENT_BALANCE,
                402,
                `Số dư không đủ\nSố dư cần: ${bet}`,
                { userId: pid, required: bet, have: u?.balance ?? 0 }
              );
            }
          }

          for (const pid of playerIds) {
            const doc = await User.findOneAndUpdate(
              { _id: pid },
              { $inc: { balance: -bet } },
              { new: true, session }
            ).select('balance');
            await logBalanceChange(
              { userId: pid, roomId: room.roomId, delta: -bet, reason: 'escrow', balanceAfter: doc?.balance },
              session
            );
          }

          md.escrowed = true;
          room.metadata = md;
          room.markModified('metadata');
          await room.save({ session });
        });
      } finally {
        await session.endSession();
      }
    }

    // ===== COINFLIP =====
    if (room.game === 'coinflip') {
      const host = room.players.find((p) => String(p.userId) === String(room.createdBy));
      const guest = room.players.find((p) => String(p.userId) !== String(room.createdBy));
      if (!host || !guest) throw new AppError(ErrorCodes.PVP_NOT_COINFLIP_ROOM, 400, 'Coinflip yêu cầu đúng 2 người');

      if (!host.side && guest.side) host.side = otherSide(guest.side);
      if (!guest.side && host.side) guest.side = otherSide(host.side);

      if (!md.serverSeed) md.serverSeed = makeServerSeed();
      md.serverSeedHash = sha256(md.serverSeed);
      if (!md.clientSeed) md.clientSeed = room.roomId;
      if (typeof md.nonce !== 'number') md.nonce = 0;

      const flip = coinflip({ serverSeed: md.serverSeed, clientSeed: md.clientSeed, nonce: md.nonce });
      md.nonce += 1;

      let winnerUserId = null;
      if (flip === host.side) winnerUserId = host.userId;
      else if (flip === guest.side) winnerUserId = guest.userId;

      const now = Date.now();
      md.pendingCoin = {
        result: flip,
        winnerUserId: String(winnerUserId || ''),
        revealAt: now + ROLL_REVEAL_MS,
      };

      room.status = 'active';
      room.metadata = md;
      room.markModified('metadata');
      await room.save();

      const io = getIO(req);
      emitRoomEvent(io, room.roomId, 'pvp:roomUpdated', {
        room: sanitizeRoomWithNow(room),
        serverNow: Date.now(),
      });

      // Payout/refund after reveal
      setTimeout(async () => {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            const rDoc = await PvpRoom.findOne({ _id: room._id }).session(session);
            if (!rDoc) return;
            const m2 = rDoc.metadata || {};
            if (!m2.pendingCoin) return;

            const bet2 = Number(rDoc.betAmount || 0);
            const pot = bet2 * 2;

            if (m2.pendingCoin.winnerUserId) {
              const upd = await User.findOneAndUpdate(
                { _id: m2.pendingCoin.winnerUserId },
                { $inc: { balance: pot } },
                { new: true, session }
              ).select('balance');
              await logBalanceChange(
                { userId: m2.pendingCoin.winnerUserId, roomId: rDoc.roomId, delta: pot, reason: 'payout_coinflip', balanceAfter: upd?.balance },
                session
              );
            } else {
              const ids = rDoc.players.map((p) => String(p.userId));
              for (const id of ids) {
                const upd = await User.findOneAndUpdate({ _id: id }, { $inc: { balance: bet2 } }, { new: true, session }).select('balance');
                await logBalanceChange(
                  { userId: id, roomId: rDoc.roomId, delta: bet2, reason: 'refund_draw_coinflip', balanceAfter: upd?.balance },
                  session
                );
              }
            }

            rDoc.status = 'finished';
            rDoc.winnerUserId = m2.pendingCoin.winnerUserId || null;
            m2.flipResult = m2.pendingCoin.result;
            m2.serverSeedReveal = m2.serverSeed;
            delete m2.pendingCoin;

            rDoc.metadata = m2;
            rDoc.markModified('metadata');
            await rDoc.save({ session });
          });

          const io2 = getIO(req);
          const fresh = await PvpRoom.findOne({ _id: room._id }).lean();
          emitRoomEvent(io2, fresh.roomId, 'pvp:roomFinished', {
            room: sanitizeRoomWithNow(fresh),
            serverNow: Date.now(),
          });
        } catch (err) {
          console.error('coinflip payout tx error:', err.message);
        } finally {
          await session.endSession();
        }
      }, ROLL_REVEAL_MS);

      return res.json(sanitizeRoomWithNow(room));
    }

    // ===== DICE =====
    if (room.game === 'dice') {
      md.turnOrder = room.players.map((p) => String(p.userId));
      md.currentTurnIndex = 0;
      if (!md.dice) md.dice = { sides: 6, rolls: [], result: null };
      md.dice.rolls = [];
      md.dice.result = null;
      delete md.pending;

      room.status = 'active';
      room.metadata = md;
      room.markModified('metadata');
      await room.save();

      const io = getIO(req);
      io?.emit('pvp:roomStarted', {
        room: sanitizeRoomWithNow(room),
        serverNow: Date.now(),
      });
      emitRoomEvent(io, room.roomId, 'pvp:roomUpdated', {
        room: sanitizeRoomWithNow(room),
        serverNow: Date.now(),
      });
      return res.json(sanitizeRoomWithNow(room));
    }

    res.json(sanitizeRoomWithNow(room));
  })
);

// ---------- DICE: ROLL (idempotent) ----------
router.post(
  '/:roomId/roll',
  auth,
  pvpActionLimiter,
  idem({ ttlMs: 120_000, namespace: 'pvp:roll' }),
  validateRequest(rollDiceSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { requestId } = req.body;
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');
    if (room.game !== 'dice') throw new AppError(ErrorCodes.PVP_NOT_DICE_ROOM, 400, 'Không phải phòng xúc xắc');
    if (room.status !== 'active') throw new AppError(ErrorCodes.PVP_ROOM_NOT_ACTIVE, 409, 'Phòng chưa active');

    const md = room.metadata || {};
    if (requestId && seenIdem(md, 'roll', requestId)) {
      return res.json(sanitizeRoomWithNow(room));
    }

    const order = Array.isArray(md.turnOrder) && md.turnOrder.length ? md.turnOrder.map(String) : room.players.map((p) => String(p.userId));
    if (!order.length || typeof md.currentTurnIndex !== 'number') {
      throw new AppError(ErrorCodes.PVP_TURN_ORDER_NOT_INITIALIZED, 409, 'Thứ tự lượt chưa khởi tạo');
    }
    const idx = typeof md.currentTurnIndex === 'number' ? md.currentTurnIndex : 0;
    const curUserId = String(order[idx]);
    const uid = String(req.user.id);
    if (uid !== curUserId) throw new AppError(ErrorCodes.PVP_NOT_YOUR_TURN, 403, 'Chưa đến lượt bạn');

    if (md.pending) {
      throw new AppError(ErrorCodes.PVP_ROLL_PENDING, 409, 'Vui lòng đợi lượt trước hoàn thành');
    }

    md.dice = md.dice || { sides: 6, rolls: [], result: null };
    md.dice.rolls = md.dice.rolls || [];
    const alreadyRolled = md.dice.rolls.some((r) => String(r.userId) === uid);
    if (alreadyRolled) {
      if (requestId) {
        markIdem(md, 'roll', requestId);
        room.metadata = md;
        room.markModified('metadata');
        await room.save();
      }
      return res.json(sanitizeRoomWithNow(room));
    }

    const sides = Number(md.dice.sides || 6);

    // Provably fair HMAC
    const serverSeed = md.serverSeed;
    const clientSeed = (md.clientSeed || room.roomId) + `|${uid}`;
    const nonce = typeof md.nonce === 'number' ? md.nonce : 0;
    const hex = hmacHex({ serverSeed, clientSeed, nonce });
    const r = hexToFloat01(hex);
    const value = Math.floor(r * sides) + 1;
    md.nonce = nonce + 1;

    if (requestId) markIdem(md, 'roll', requestId);

    const now = Date.now();
    const revealAt = now + ROLL_REVEAL_MS;
    const advanceAt = revealAt + HOLD_AFTER_REVEAL_MS;
    md.pending = { userId: uid, value, revealAt, advanceAt };

    room.metadata = md;
    room.markModified('metadata');
    await room.save();

    const io = getIO(req);
    emitRoomEvent(io, room.roomId, 'pvp:roomUpdated', {
      room: sanitizeRoomWithNow(room),
      serverNow: Date.now(),
    });

    // Reveal
    setTimeout(async () => {
      try {
        const rDoc = await PvpRoom.findOne({ _id: room._id });
        if (!rDoc || rDoc.status !== 'active') return;
        const m2 = rDoc.metadata || {};
        if (!m2.pending || String(m2.pending.userId) !== uid || m2.pending.value !== value) return;

        m2.dice = m2.dice || { sides: 6, rolls: [], result: null };
        m2.dice.rolls = m2.dice.rolls || [];
        if (!m2.dice.rolls.some((x) => String(x.userId) === uid)) {
          m2.dice.rolls.push({ userId: uid, value });
        }

        rDoc.metadata = m2;
        rDoc.markModified('metadata');
        await rDoc.save();
        emitRoomEvent(getIO(req), rDoc.roomId, 'pvp:roomUpdated', {
          room: sanitizeRoomWithNow(rDoc),
          serverNow: Date.now(),
        });
      } catch {}
    }, ROLL_REVEAL_MS);

    // Next turn / finish
    setTimeout(async () => {
      try {
        const rDoc = await PvpRoom.findOne({ _id: room._id });
        if (!rDoc) return;
        const m2 = rDoc.metadata || {};
        if (!m2.pending || String(m2.pending.userId) !== uid || m2.pending.value !== value) return;

        const order2 = Array.isArray(m2.turnOrder) && m2.turnOrder.length ? m2.turnOrder.map(String) : rDoc.players.map((p) => String(p.userId));
        const idx2 = typeof m2.currentTurnIndex === 'number' ? m2.currentTurnIndex : 0;

        const allRolled = (m2.dice?.rolls?.length || 0) >= order2.length;

        if (allRolled) {
          const max = Math.max(...m2.dice.rolls.map((x) => x.value));
          const winners = m2.dice.rolls.filter((x) => x.value === max).map((x) => String(x.userId));

          const bet2 = Number(rDoc.betAmount || 0);
          const pot = bet2 * order2.length;
          const share = pot / winners.length;

          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              for (const wid of winners) {
                const upd = await User.findOneAndUpdate({ _id: wid }, { $inc: { balance: share } }, { new: true, session }).select('balance');
                await logBalanceChange({ userId: wid, roomId: rDoc.roomId, delta: share, reason: 'payout_dice', balanceAfter: upd?.balance }, session);
              }

              rDoc.status = 'finished';
              rDoc.winnerUserId = null;
              m2.serverSeedReveal = m2.serverSeed;
              m2.dice.result = { max, winners, pot };
              delete m2.pending;

              rDoc.metadata = m2;
              rDoc.markModified('metadata');
              await rDoc.save({ session });
            });
          } finally {
            await session.endSession();
          }

          const io2 = getIO(req);
          const fresh = await PvpRoom.findOne({ _id: room._id }).lean();
          emitRoomEvent(io2, fresh.roomId, 'pvp:roomFinished', {
            room: sanitizeRoomWithNow(fresh),
            serverNow: Date.now(),
          });
          return;
        }

        const nextIdx = (idx2 + 1) % order2.length;
        m2.currentTurnIndex = nextIdx;
        delete m2.pending;

        rDoc.metadata = m2;
        rDoc.markModified('metadata');
        await rDoc.save();
        emitRoomEvent(getIO(req), rDoc.roomId, 'pvp:roomUpdated', {
          room: sanitizeRoomWithNow(rDoc),
          serverNow: Date.now(),
        });
      } catch {}
    }, ROLL_REVEAL_MS + HOLD_AFTER_REVEAL_MS);

    return res.json(sanitizeRoomWithNow(room));
  })
);

// ---------- FINISH (idempotent / legacy hook) ----------
router.post(
  '/:roomId/finish',
  auth,
  pvpActionLimiter,
  idem({ ttlMs: 120_000, namespace: 'pvp:finish' }),
  validateRequest(finishRoomSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { winnerUserId, metadata, requestId } = req.body;
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');

    const md = room.metadata || {};
    if (requestId && seenIdem(md, 'finish', requestId)) {
      return res.json(sanitizeRoomWithNow(room));
    }

    if (room.status === 'finished') {
      if (requestId) {
        markIdem(md, 'finish', requestId);
        room.metadata = md;
        room.markModified('metadata');
        await room.save();
      }
      return res.json(sanitizeRoomWithNow(room));
    }

    if (requestId) markIdem(md, 'finish', requestId);

    room.winnerUserId = winnerUserId || null;
    room.status = 'finished';
    if (metadata) room.metadata = { ...(room.metadata || {}), ...metadata };
    if (room.metadata?.pending) delete room.metadata.pending;
    if (room.metadata?.pendingCoin) delete room.metadata.pendingCoin;

    room.markModified('metadata');
    await room.save();

    const io = getIO(req);
    emitRoomEvent(io, room.roomId, 'pvp:roomFinished', {
      room: sanitizeRoomWithNow(room),
      serverNow: Date.now(),
    });

    res.json(sanitizeRoomWithNow(room));
  })
);

// ---------- VERIFY ----------
router.get(
  '/:roomId/verify',
  auth,
  asyncHandler(async (req, res) => {
    const doc = await PvpRoom.findOne({ roomId: req.params.roomId }).lean();
    if (!doc) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');
    if (doc.status !== 'finished') throw new AppError(ErrorCodes.PVP_ROOM_NOT_FINISHED, 409, 'Phòng chưa kết thúc');

    const md = doc.metadata || {};
    const base = {
      game: doc.game,
      serverSeedHash: md.serverSeedHash || null,
      serverSeedReveal: md.serverSeedReveal || null,
      clientSeed: md.clientSeed || doc.roomId,
      nonceStart: typeof md.nonce === 'number' && Array.isArray(md?.dice?.rolls) ? md.nonce - md.dice.rolls.length : typeof md.nonce === 'number' ? md.nonce : 0,
      serverNow: Date.now(),
    };

    if (doc.game === 'coinflip') {
      const nonceUsed = typeof md.nonce === 'number' ? md.nonce - 1 : null;
      return res.json({
        ...base,
        coinflip: {
          result: md.flipResult || null,
          winnerUserId: doc.winnerUserId ? String(doc.winnerUserId) : null,
          nonceUsed,
        },
      });
    }

    if (doc.game === 'dice') {
      const sides = Number(md?.dice?.sides || 6);
      const rolls = Array.isArray(md?.dice?.rolls) ? md.dice.rolls : [];
      const nonceStart = base.nonceStart || 0;
      const enriched = rolls.map((r, i) => ({
        userId: String(r.userId),
        value: r.value,
        nonce: nonceStart + i,
      }));
      return res.json({
        ...base,
        dice: { sides, rolls: enriched },
      });
    }

    return res.json(base);
  })
);

// ---------- LEGACY ENDPOINTS ----------
router.post(
  '/:roomId/bet',
  auth,
  validateRequest(placeBetSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { amount, choice } = req.body;

    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');
    if (room.status !== 'active') throw new AppError(ErrorCodes.PVP_ROOM_NOT_ACTIVE, 409, 'Phòng chưa active');

    const uid = String(req.user.id);
    const inRoom = room.players.some((p) => String(p.userId) === uid);
    if (!inRoom) throw new AppError(ErrorCodes.PVP_NOT_MEMBER, 403, 'Bạn không ở trong phòng');

    room.bets.push({ userId: req.user.id, amount, choice });
    await room.save();

    const io = getIO(req);
    emitRoomEvent(io, room.roomId, 'pvp:roomUpdated', {
      room: sanitizeRoomWithNow(room),
      serverNow: Date.now(),
    });
    res.json(sanitizeRoomWithNow(room));
  })
);

router.post(
  '/:roomId/leave',
  auth,
  asyncHandler(async (req, res) => {
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');

    if (room.status === 'active') {
      throw new AppError(ErrorCodes.PVP_ROOM_ALREADY_ACTIVE, 409, 'Không thể rời phòng đang active');
    }

    const uid = String(req.user.id);
    if (String(room.createdBy) === uid) {
      throw new AppError(ErrorCodes.PVP_ONLY_OWNER, 409, 'Chủ phòng không thể rời. Hãy xóa phòng.');
    }

    const before = room.players.length;
    room.players = room.players.filter((p) => String(p.userId) !== uid);
    if (room.players.length === before) {
      throw new AppError(ErrorCodes.PVP_NOT_MEMBER, 400, 'Bạn không ở trong phòng');
    }

    if (room.players.length === 0) {
      await PvpRoom.deleteOne({ _id: room._id });
      const io = getIO(req);
      io?.emit('pvp:roomDeleted', { roomId: room.roomId, serverNow: Date.now() });
      return res.json({ ok: true, deleted: true, serverNow: Date.now() });
    }

    await room.save();
    const io = getIO(req);
    emitRoomEvent(io, room.roomId, 'pvp:roomUpdated', {
      room: sanitizeRoomWithNow(room),
      serverNow: Date.now(),
    });

    res.json({ ok: true, room: sanitizeRoomWithNow(room) });
  })
);

router.delete(
  '/:roomId',
  auth,
  asyncHandler(async (req, res) => {
    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');
    if (String(room.createdBy) !== String(req.user.id)) {
      throw new AppError(ErrorCodes.PVP_ONLY_OWNER, 403, 'Chỉ chủ phòng mới có thể xóa');
    }
    if (room.status !== 'waiting') {
      throw new AppError(ErrorCodes.PVP_ROOM_NOT_WAITING, 409, 'Chỉ có thể xóa khi đang chờ');
    }

    await PvpRoom.deleteOne({ _id: room._id });
    const io = getIO(req);
    io?.emit('pvp:roomDeleted', { roomId: room.roomId, serverNow: Date.now() });

    res.json({ ok: true, serverNow: Date.now() });
  })
);

router.post(
  '/:roomId/invite',
  auth,
  validateRequest(inviteSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { targetUserId } = req.body;

    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError(ErrorCodes.INVALID_USER_ID, 400, 'ID người dùng không hợp lệ');
    }
    const target = await User.findById(targetUserId).select('username name').lean();
    if (!target) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND, 404, 'Không tìm thấy người dùng');
    }

    const room = await PvpRoom.findOne({ roomId: req.params.roomId });
    if (!room) throw new AppError(ErrorCodes.PVP_ROOM_NOT_FOUND, 404, 'Không tìm thấy phòng');

    const isMember = room.players.some((p) => String(p.userId) === String(req.user.id)) || String(room.createdBy) === String(req.user.id);
    if (!isMember) throw new AppError(ErrorCodes.PVP_NOT_MEMBER, 403, 'Chỉ thành viên mới có thể mời');

    const inviter = await User.findById(req.user.id).select('username name email').lean();
    const fromUserName = inviter?.username || inviter?.name || inviter?.email || 'Unknown';

    const path = `/game/battle/room/${room.roomId}`;
    const notif = await Notification.create({
      userId: target._id,
      type: 'pvp_invite',
      message: `Lời mời từ ${fromUserName} tham gia phòng ${room.game}`,
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

    const io = getIO(req);
    const sockets = getOnline(req)[String(target._id)] || [];
    const payload = {
      _id: String(notif._id),
      userId: String(target._id),
      type: notif.type,
      message: notif.message,
      read: false,
      createdAt: notif.createdAt,
      link: notif.link,
      metadata: notif.metadata,
      serverNow: Date.now(),
    };
    sockets.forEach((sid) => io?.to(sid).emit('notification', payload));
    io?.to(sockets).emit?.('pvp:invite', payload);

    res.json({
      ok: true,
      delivered: sockets.length,
      notificationId: String(notif._id),
      invitedUser: { id: String(target._id), username: target.username || target.name || '' },
      serverNow: Date.now(),
    });
  })
);

module.exports = router;