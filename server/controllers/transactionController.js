// server/controllers/transactionController.js
const Transaction = require('../models/Transaction')

exports.getTransactions = async (req, res) => {
  try {
    const { userId } = req.params
    const txs = await Transaction
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()
    return res.json({ transactions: txs })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
