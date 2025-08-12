// server/controllers/rewardController.js
const User = require('../models/User');

const REWARD_AMOUNTS = {
  hourly: 10,
  daily:  100,
  weekly: 1000
};

const COOLDOWNS_MS = {
  hourly: 60 * 60 * 1000,
  daily:  24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000
};

// GET /api/rewards
exports.getRewardsStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      hourly: user.hourlyCollectedAt,
      daily:  user.dailyCollectedAt,
      weekly: user.weeklyCollectedAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/rewards/:type
exports.collectReward = async (req, res) => {
  try {
    const { type } = req.params; // 'hourly', 'daily', 'weekly'
    if (!['hourly', 'daily', 'weekly'].includes(type)) {
      return res.status(400).json({ error: 'Invalid reward type' });
    }
    const user = await User.findById(req.user.id);
    const last = user[`${type}CollectedAt`];
    const now  = Date.now();
    if (last && now - last.getTime() < COOLDOWNS_MS[type]) {
      const next = new Date(last.getTime() + COOLDOWNS_MS[type]);
      return res.status(400).json({ error: 'Cooldown active', nextAvailable: next });
    }
    // Grant reward
    const amount = REWARD_AMOUNTS[type];
    user.balance += amount;
    user[`${type}CollectedAt`] = new Date();
    await user.save();
    res.json({ message: `Collected ${type} reward`, amount, balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
