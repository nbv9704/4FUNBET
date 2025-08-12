// server/controllers/historyController.js
const GameHistory = require('../models/GameHistory');
const mongoose = require('mongoose');

exports.getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await Promise.all([
      GameHistory.find({ user: new mongoose.Types.ObjectId(id) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('game betAmount outcome payout createdAt'),
      GameHistory.countDocuments({ user: new mongoose.Types.ObjectId(id) })
    ]);

    res.json({ history, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
