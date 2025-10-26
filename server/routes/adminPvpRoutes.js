// server/routes/adminPvpRoutes.js
const express = require("express");
const PvpRoom = require("../models/PvpRoom");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { getLastSweepAt } = require("../cron/cleanupRooms");

const router = express.Router();

// GET /admin/pvp/health
router.get("/health", auth, admin, async (req, res) => {
  try {
    const countsAgg = await PvpRoom.aggregate([
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]);
    const byStatus = {};
    countsAgg.forEach((c) => (byStatus[c._id] = c.n));

    const now = Date.now();
    const sweepIntervalMs = Number(process.env.PVP_SWEEP_INTERVAL_MS) || 60000;
    const lastSweepAt = getLastSweepAt();
    const nextSweepAt = lastSweepAt ? lastSweepAt + sweepIntervalMs : null;

    const staleCoinflips = await PvpRoom.countDocuments({
      status: "active",
      game: "coinflip",
      "metadata.pendingCoin.revealAt": { $lt: now },
    });
    const staleDice = await PvpRoom.countDocuments({
      status: "active",
      game: "dice",
      "metadata.pending.advanceAt": { $lt: now },
    });

    res.json({
      ok: true,
      serverNow: now,
      serverNowIso: new Date(now).toISOString(),
      counts: byStatus,
      stale: { coinflip: staleCoinflips, dice: staleDice },
      cron: {
        sweepIntervalMs,
        lastSweepAt,
        lastSweepIso: lastSweepAt ? new Date(lastSweepAt).toISOString() : null,
        nextSweepAt,
        nextSweepIso: nextSweepAt ? new Date(nextSweepAt).toISOString() : null,
      },
      uptimeSec: Math.floor(process.uptime()),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router };
