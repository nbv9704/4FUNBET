// server/cron/cleanupRooms.js
const mongoose = require('mongoose');
const PvpRoom = require('../models/PvpRoom');
const User = require('../models/User');
const { logBalanceChange } = require('../utils/balanceLog');
const { hmacHex } = require('../utils/fair');
const fs = require('fs');
const path = require('path');

/** ===================== Config (override qua ENV) ===================== */
const MAX_WAITING_AGE_MS = Number(process.env.PVP_MAX_WAITING_AGE_MS || 45 * 60 * 1000); // 45m
const SWEEP_INTERVAL_MS  = Number(process.env.PVP_SWEEP_INTERVAL_MS  || 60 * 1000);      // 60s
const COINFLIP_GRACE_MS  = Number(process.env.PVP_COINFLIP_GRACE_MS  || 10 * 1000);     // 10s (sau revealAt)
const DICE_GRACE_MS      = Number(process.env.PVP_DICE_GRACE_MS      || 2 * 1000);      // 2s (sau advanceAt)
const DICE_IDLE_MS       = Number(process.env.PVP_DICE_IDLE_MS       || 60 * 1000);     // 60s (không pending, đang chờ lượt kế nhưng không ai roll)
const DICE_UNSTARTED_REFUND_MS = Number(process.env.PVP_DICE_UNSTARTED_REFUND_MS || 15 * 60 * 1000); // 15m (đã start nhưng chưa có roll nào)

/** ===================== Logger level cho CRON =====================
 * Điều khiển log ra console bằng PVP_CRON_LOG_LEVEL:
 *  - 'silent' | 'error' | 'info' | 'debug' (mặc định: 'error')
 */
const CRON_LOG_LEVEL = (process.env.PVP_CRON_LOG_LEVEL || 'error').toLowerCase();
const LEVELS = { silent: 0, error: 1, info: 2, debug: 3 };
function ok(level) { return (LEVELS[CRON_LOG_LEVEL] || 1) >= (LEVELS[level] || 1); }

/** ===================== File log riêng cho CRON (tuỳ chọn) =====================
 * Bật/tắt qua ENV:
 *  - PVP_CRON_FILE_LOG=1           (mặc định 0: tắt)
 *  - PVP_CRON_LOG_DIR=./logs       (thư mục chứa file log)
 *  - PVP_CRON_LOG_MAX_MB=10        (dung lượng tối đa mỗi file, tự xoay segment)
 * Mỗi lần khởi động app sẽ tạo bộ file mới theo timestamp.
 */
const FILE_LOG_ENABLED = process.env.PVP_CRON_FILE_LOG === '1';
const FILE_LOG_DIR = process.env.PVP_CRON_LOG_DIR || path.resolve(process.cwd(), 'logs');
const FILE_LOG_MAX = Math.max(1, Number(process.env.PVP_CRON_LOG_MAX_MB || 10)) * 1024 * 1024;

let fileLogBase = null;   // pvp-cron-YYYYMMDD-HHmmss
let fileLogIndex = 0;     // -0, -1, -2...
let fileLogStream = null;
let fileLogSize = 0;

function initFileLoggerOnce() {
  if (!FILE_LOG_ENABLED || fileLogStream) return;
  fs.mkdirSync(FILE_LOG_DIR, { recursive: true });
  const ts = new Date().toISOString()
    .replace(/[:.]/g, '-')   // an toàn cho filename
    .replace('T', '-')
    .replace('Z', '');
  fileLogBase = `pvp-cron-${ts}`;
  openNewLogSegment();
}

function openNewLogSegment() {
  if (!FILE_LOG_ENABLED) return;
  if (fileLogStream) {
    try { fileLogStream.end(); } catch (_) {}
  }
  const filename = path.join(FILE_LOG_DIR, `${fileLogBase}-${fileLogIndex}.log`);
  fileLogStream = fs.createWriteStream(filename, { flags: 'a' });
  fileLogSize = 0;
  fileLogIndex += 1;
}

function writeFileLog(obj) {
  if (!FILE_LOG_ENABLED) return;
  try {
    if (!fileLogStream) initFileLoggerOnce();
    const line = JSON.stringify(obj) + '\n';
    fileLogStream.write(line);
    fileLogSize += Buffer.byteLength(line);
    if (fileLogSize >= FILE_LOG_MAX) {
      openNewLogSegment();
    }
  } catch (_) { /* nuốt lỗi để không crash */ }
}

const log = {
  info: (...args) => {
    if (ok('info')) console.log('[PVP CRON]', ...args);
    writeFileLog({ ts: new Date().toISOString(), level: 'info', tag: 'PVP_CRON', msg: args.join(' ') });
  },
  debug: (...args) => {
    if (ok('debug')) console.log('[PVP CRON]', ...args);
    writeFileLog({ ts: new Date().toISOString(), level: 'debug', tag: 'PVP_CRON', msg: args.join(' ') });
  },
  error: (...args) => {
    if (ok('error')) console.error('[PVP CRON]', ...args);
    writeFileLog({ ts: new Date().toISOString(), level: 'error', tag: 'PVP_CRON', msg: args.join(' ') });
  },
};

/** ===================== State for health ===================== */
let LAST_SWEEP_AT = null;
let SWEEP_TIMER = null;
function getLastSweepAt() { return LAST_SWEEP_AT; }
function touchLastSweep() { LAST_SWEEP_AT = Date.now(); }

/** ===================== Helpers ===================== */
function getIO(app) { return app?.get('io'); }
function hexToFloat01(hex) { const n = parseInt(hex.slice(0, 8), 16); return n / 0x100000000; }

async function incBalanceAndLog({ userId, delta, roomId, reason }, session) {
  try {
    const upd = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { balance: delta } },
      { new: true, session }
    ).select('balance');
    await logBalanceChange({ userId, roomId, delta, reason, balanceAfter: upd?.balance });
  } catch (e) {
    log.error('incBalance error:', e.message);
  }
}

function sanitizeRoomWithNow(doc) {
  if (!doc) return doc;
  const room = JSON.parse(JSON.stringify(doc));
  if (room?.metadata && room.status !== 'finished') delete room.metadata.serverSeed;
  const md = room.metadata || {};
  if (md?.pendingCoin?.revealAt && !md._revealAt) md._revealAt = md.pendingCoin.revealAt;
  if (md?.pending?.revealAt && !md._revealAt) md._revealAt = md.pending.revealAt;
  if (md?.pending?.advanceAt && !md.turnLockedUntil) md.turnLockedUntil = md.pending.advanceAt;
  room.serverNow = Date.now();
  return room;
}

/** ===================== 1) Xoá phòng WAITING quá hạn ===================== */
async function cleanupWaitingRooms(app) {
  const beforeTs = Date.now() - MAX_WAITING_AGE_MS;
  const docs = await PvpRoom.find({
    status: 'waiting',
    $or: [{ updatedAt: { $lt: beforeTs } }, { createdAt: { $lt: beforeTs } }]
  }).lean();

  if (!docs.length) return;
  const io = getIO(app);

  for (const r of docs) {
    try {
      // Bảo hiểm: nếu lỡ escrowed (rất hiếm) thì refund
      const bet = Number(r.betAmount || 0);
      if (bet > 0 && r?.metadata?.escrowed === true) {
        const ids = (r.players || []).map(p => String(p.userId));
        for (const uid of ids) {
          await incBalanceAndLog({ userId: uid, delta: bet, roomId: r.roomId, reason: 'refund_waiting_cleanup' });
        }
      }
      await PvpRoom.deleteOne({ _id: r._id });
      io?.emit('pvp:roomDeleted', { roomId: r.roomId, serverNow: Date.now() });
      log.info('deleted waiting room', r.roomId);
      touchLastSweep();
    } catch (e) {
      log.error('cleanup waiting failed:', r.roomId, e.message);
      touchLastSweep();
    }
  }
}

/** ===================== 2) Hoàn tất COINFLIP kẹt reveal ===================== */
async function finalizeStaleCoinflip(app) {
  const now = Date.now();
  const docs = await PvpRoom.find({
    status: 'active',
    game: 'coinflip',
    'metadata.pendingCoin.revealAt': { $lt: now - COINFLIP_GRACE_MS }
  });

  const io = getIO(app);
  for (const room of docs) {
    try {
      const md = room.metadata || {};
      const pend = md.pendingCoin;
      if (!pend) continue;

      const bet = Number(room.betAmount || 0);
      const pot = bet * 2;

      if (pend.winnerUserId) {
        await incBalanceAndLog({ userId: pend.winnerUserId, delta: pot, roomId: room.roomId, reason: 'payout_coinflip_cron' });
        room.winnerUserId = pend.winnerUserId;
      } else {
        // Hoà – refund
        const ids = room.players.map(p => String(p.userId));
        for (const uid of ids) {
          await incBalanceAndLog({ userId: uid, delta: bet, roomId: room.roomId, reason: 'refund_draw_coinflip_cron' });
        }
        room.winnerUserId = null;
      }

      // finalize
      md.flipResult = pend.result;
      md.serverSeedReveal = md.serverSeed;
      delete md.pendingCoin;

      room.status = 'finished';
      room.metadata = md;
      room.markModified('metadata');
      await room.save();

      io?.to(`pvp:${room.roomId}`).emit('pvp:roomFinished', {
        room: sanitizeRoomWithNow(room),
        serverNow: Date.now(),
      });

      log.info('finalized coinflip', room.roomId);
      touchLastSweep();
    } catch (e) {
      log.error('finalize coinflip failed:', room.roomId, e.message);
      touchLastSweep();
    }
  }
}

/** ===================== 3a) Sửa DICE kẹt pending (quá grace) ===================== */
async function repairStaleDice(app) {
  const now = Date.now();
  const docs = await PvpRoom.find({
    status: 'active',
    game: 'dice',
    'metadata.pending.advanceAt': { $lt: now - DICE_GRACE_MS }
  });

  const io = getIO(app);
  for (const room of docs) {
    try {
      const md = room.metadata || {};
      const pend = md.pending;
      if (!pend) continue;

      // Step 1: ensure đã reveal (push roll) nếu trễ
      if (pend.revealAt && now > pend.revealAt && md?.dice) {
        const already = (md.dice.rolls || []).some(x => String(x.userId) === String(pend.userId));
        if (!already) {
          md.dice.rolls = md.dice.rolls || [];
          md.dice.rolls.push({ userId: pend.userId, value: pend.value });
        }
      }

      // Step 2: advance hoặc finish
      const order = Array.isArray(md.turnOrder) && md.turnOrder.length
        ? md.turnOrder.map(String)
        : (room.players || []).map(p => String(p.userId));
      const allRolled = (md?.dice?.rolls?.length || 0) >= order.length;

      if (allRolled) {
        const max = Math.max(...md.dice.rolls.map(x => x.value));
        const winners = md.dice.rolls.filter(x => x.value === max).map(x => String(x.userId));
        const bet = Number(room.betAmount || 0);
        const pot = bet * order.length;
        const share = pot / winners.length;

        // payout trong tx
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            for (const wid of winners) {
              await incBalanceAndLog({ userId: wid, delta: share, roomId: room.roomId, reason: 'payout_dice_cron' }, session);
            }
            room.status = 'finished';
            room.winnerUserId = null;
            md.serverSeedReveal = md.serverSeed;
            md.dice.result = { max, winners, pot };
            delete md.pending;

            room.metadata = md;
            room.markModified('metadata');
            await room.save({ session });
          });
        } finally {
          await session.endSession();
        }

        io?.to(`pvp:${room.roomId}`).emit('pvp:roomFinished', {
          room: sanitizeRoomWithNow(room),
          serverNow: Date.now(),
        });
        log.info('finished dice', room.roomId);
        touchLastSweep();
      } else {
        // Next turn
        const idx = typeof md.currentTurnIndex === 'number' ? md.currentTurnIndex : 0;
        md.currentTurnIndex = (idx + 1) % order.length;
        delete md.pending;

        room.metadata = md;
        room.markModified('metadata');
        await room.save();

        io?.to(`pvp:${room.roomId}`).emit('pvp:roomUpdated', {
          room: sanitizeRoomWithNow(room),
          serverNow: Date.now(),
        });
        log.info('advanced dice turn', room.roomId);
        touchLastSweep();
      }
    } catch (e) {
      log.error('repair dice failed:', room.roomId, e.message);
      touchLastSweep();
    }
  }
}

/** ===================== 3b) Auto-roll DICE khi “đứng yên” (không pending) ===================== */
async function autoRollIdleDice(app) {
  const threshold = new Date(Date.now() - DICE_IDLE_MS);

  // active dice, không pending, updatedAt quá cũ, và chưa đủ lượt
  const rooms = await PvpRoom.find({
    status: 'active',
    game: 'dice',
    $or: [{ 'metadata.pending': { $exists: false } }, { 'metadata.pending': null }],
    updatedAt: { $lt: threshold },
  });

  const io = getIO(app);

  for (const room of rooms) {
    try {
      const md = room.metadata || {};
      const order = Array.isArray(md.turnOrder) && md.turnOrder.length
        ? md.turnOrder.map(String)
        : (room.players || []).map(p => String(p.userId));

      if (!order.length) continue;

      const rolls = (md?.dice?.rolls || []);
      if (rolls.length >= order.length) continue; // đủ lượt rồi

      const idx = typeof md.currentTurnIndex === 'number' ? md.currentTurnIndex : 0;
      const curUserId = String(order[idx]);

      // Tạo roll deterministically giống /roll
      const sides = Number(md?.dice?.sides || 6);
      const serverSeed = md.serverSeed;
      if (!serverSeed) continue; // chưa init seed => bỏ qua

      const clientSeed = (md.clientSeed || room.roomId) + `|${curUserId}`;
      const nonce = typeof md.nonce === 'number' ? md.nonce : 0;

      const hex = hmacHex({ serverSeed, clientSeed, nonce });
      const r = hexToFloat01(hex);
      const value = Math.floor(r * sides) + 1;
      md.nonce = nonce + 1;

      // Push roll ngay (không “pending” vì cron đang auto)
      md.dice = md.dice || { sides, rolls: [], result: null };
      md.dice.rolls = md.dice.rolls || [];
      if (!md.dice.rolls.some(x => String(x.userId) === curUserId)) {
        md.dice.rolls.push({ userId: curUserId, value });
      }

      // Advance hoặc Finish
      const allRolled = md.dice.rolls.length >= order.length;
      if (allRolled) {
        const max = Math.max(...md.dice.rolls.map(x => x.value));
        const winners = md.dice.rolls.filter(x => x.value === max).map(x => String(x.userId));
        const bet = Number(room.betAmount || 0);
        const pot = bet * order.length;
        const share = winners.length ? pot / winners.length : 0;

        // payout trong tx
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            if (share > 0) {
              for (const wid of winners) {
                await incBalanceAndLog({ userId: wid, delta: share, roomId: room.roomId, reason: 'payout_dice_idle_cron' }, session);
              }
            }
            room.status = 'finished';
            room.winnerUserId = null;
            md.serverSeedReveal = md.serverSeed;
            md.dice.result = { max, winners, pot };

            room.metadata = md;
            room.markModified('metadata');
            await room.save({ session });
          });
        } finally {
          await session.endSession();
        }

        io?.to(`pvp:${room.roomId}`).emit('pvp:roomFinished', {
          room: sanitizeRoomWithNow(room),
          serverNow: Date.now(),
        });
        log.info('auto-finished idle dice', room.roomId);
        touchLastSweep();
      } else {
        // sang lượt kế
        md.currentTurnIndex = (idx + 1) % order.length;

        room.metadata = md;
        room.markModified('metadata');
        await room.save();

        io?.to(`pvp:${room.roomId}`).emit('pvp:roomUpdated', {
          room: sanitizeRoomWithNow(room),
          serverNow: Date.now(),
        });
        log.info('auto-rolled idle dice turn for', room.roomId, '→ next turn');
        touchLastSweep();
      }
    } catch (e) {
      log.error('autoRollIdleDice failed:', room.roomId, e.message);
      touchLastSweep();
    }
  }
}

/** ===================== 3c) CANCEL + REFUND dice đã start nhưng CHƯA có roll nào ===================== */
async function cancelAndRefundUnstartedDice(app) {
  const threshold = new Date(Date.now() - DICE_UNSTARTED_REFUND_MS);

  const rooms = await PvpRoom.find({
    status: 'active',
    game: 'dice',
    $or: [{ 'metadata.pending': { $exists: false } }, { 'metadata.pending': null }],
    updatedAt: { $lt: threshold },
    'metadata.dice.rolls': { $size: 0 },
  });

  const io = getIO(app);

  for (const room of rooms) {
    try {
      const md = room.metadata || {};
      const bet = Number(room.betAmount || 0);
      const playerIds = (room.players || []).map(p => String(p.userId));
      if (!playerIds.length) {
        await PvpRoom.deleteOne({ _id: room._id });
        io?.emit('pvp:roomDeleted', { roomId: room.roomId, serverNow: Date.now() });
        log.info('deleted dice room with no players', room.roomId);
        touchLastSweep();
        continue;
      }

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          if (bet > 0 && md.escrowed === true) {
            for (const uid of playerIds) {
              await incBalanceAndLog({ userId: uid, delta: bet, roomId: room.roomId, reason: 'refund_dice_unstarted_idle' }, session);
            }
          }
          room.status = 'cancelled';
          room.metadata = md;
          room.markModified('metadata');
          await room.save({ session });
        });
      } finally {
        await session.endSession();
      }

      io?.to(`pvp:${room.roomId}`).emit('pvp:roomUpdated', {
        room: sanitizeRoomWithNow(room),
        serverNow: Date.now(),
      });
      log.info('cancelled & refunded unstarted dice', room.roomId);
      touchLastSweep();
    } catch (e) {
      log.error('cancel unstarted dice failed:', room.roomId, e.message);
      touchLastSweep();
    }
  }
}

/** ===================== Scheduler ===================== */
function schedulePvpCleanup(app) {
  // clear timer cũ nếu có
  if (SWEEP_TIMER) {
    clearInterval(SWEEP_TIMER);
    SWEEP_TIMER = null;
  }

  initFileLoggerOnce();   // khởi tạo file logger nếu bật

  // Cập nhật ngay để trang /health không hiển thị '-'
  touchLastSweep();

  SWEEP_TIMER = setInterval(async () => {
    try {
      await cleanupWaitingRooms(app);   touchLastSweep();
      await finalizeStaleCoinflip(app); touchLastSweep();
      await repairStaleDice(app);       touchLastSweep();
      await autoRollIdleDice(app);      touchLastSweep();
      await cancelAndRefundUnstartedDice(app); touchLastSweep();
    } catch (e) {
      log.error('sweep error:', e.message);
    } finally {
      // dấu tick cho lần quét
      touchLastSweep();
    }
  }, SWEEP_INTERVAL_MS);

  log.debug('scheduled sweep every', SWEEP_INTERVAL_MS, 'ms');
}

function stopPvpCleanup() {
  if (SWEEP_TIMER) {
    clearInterval(SWEEP_TIMER);
    SWEEP_TIMER = null;
    log.debug('sweep stopped');
  }
}

module.exports = { schedulePvpCleanup, stopPvpCleanup, getLastSweepAt };
