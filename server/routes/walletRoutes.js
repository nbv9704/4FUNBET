// server/routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const validateRequest = require('../middleware/validateRequest');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { AppError } = require('../utils/AppError');
const { ErrorCodes, ErrorMessages } = require('../utils/ErrorCodes');
const { transferLimiter } = require('../middleware/rateLimitStrict');

// ✅ Import validation schemas
const { depositSchema, withdrawSchema, transferSchema } = require('../validation/walletSchemas');

// Helper: create & emit notification
async function pushNotification(req, userId, type, message) {
  const notif = await Notification.create({ userId, type, message });
  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers');
  const sockets = onlineUsers[userId] || [];
  sockets.forEach((socketId) => {
    io.to(socketId).emit('notification', notif);
  });
}

// POST /api/wallet/:id/bank/deposit
router.post(
  '/:id/bank/deposit',
  auth,
  validateObjectId('id'),
  validateRequest(depositSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { amount } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(ErrorCodes.USER_NOT_FOUND, 404, ErrorMessages[ErrorCodes.USER_NOT_FOUND]);

    if (user.balance < amount) {
      throw new AppError(ErrorCodes.INSUFFICIENT_BALANCE, 402, ErrorMessages[ErrorCodes.INSUFFICIENT_BALANCE], {
        required: amount,
        have: user.balance,
      });
    }

    user.balance -= amount;
    user.bank += amount;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: 'deposit',
      amount,
      createdAt: new Date(),
    });

    await pushNotification(req, user._id, 'deposit', `Bạn đã nạp ${amount} từ Tài khoản vào Ngân hàng`);

    res.json({ balance: user.balance, bank: user.bank });
  })
);

// POST /api/wallet/:id/bank/withdraw
router.post(
  '/:id/bank/withdraw',
  auth,
  validateObjectId('id'),
  validateRequest(withdrawSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { amount } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(ErrorCodes.USER_NOT_FOUND, 404, ErrorMessages[ErrorCodes.USER_NOT_FOUND]);

    if (user.bank < amount) {
      throw new AppError(ErrorCodes.INSUFFICIENT_BANK_BALANCE, 402, ErrorMessages[ErrorCodes.INSUFFICIENT_BANK_BALANCE], {
        required: amount,
        have: user.bank,
      });
    }

    user.bank -= amount;
    user.balance += amount;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: 'withdraw',
      amount,
      createdAt: new Date(),
    });

    await pushNotification(req, user._id, 'withdraw', `Bạn đã rút ${amount} từ Ngân hàng về Tài khoản`);

    res.json({ balance: user.balance, bank: user.bank });
  })
);

// POST /api/wallet/:id/transfer
router.post(
  '/:id/transfer',
  auth,
  validateObjectId('id'),
  transferLimiter, // ✅ Apply strict rate limit
  validateRequest(transferSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { toUserId, amount } = req.body;

    // ✅ Validate toUserId format
    if (!require('mongoose').isValidObjectId(toUserId)) {
      throw new AppError(ErrorCodes.INVALID_USER_ID, 400, 'ID người nhận không hợp lệ');
    }

    const fromUser = await User.findById(req.params.id);
    const toUser = await User.findById(toUserId);

    if (!fromUser || !toUser) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND, 404, ErrorMessages[ErrorCodes.USER_NOT_FOUND]);
    }

    if (fromUser.balance < amount) {
      throw new AppError(ErrorCodes.INSUFFICIENT_BALANCE, 402, ErrorMessages[ErrorCodes.INSUFFICIENT_BALANCE], {
        required: amount,
        have: fromUser.balance,
      });
    }

    fromUser.balance -= amount;
    toUser.balance += amount;
    await fromUser.save();
    await toUser.save();

    await Transaction.create({
      userId: fromUser._id,
      type: 'transfer',
      amount,
      toUserId: toUser._id,
      createdAt: new Date(),
    });
    await Transaction.create({
      userId: toUser._id,
      type: 'transfer',
      amount,
      fromUserId: fromUser._id,
      createdAt: new Date(),
    });

    await pushNotification(req, fromUser._id, 'transfer_sent', `Bạn đã chuyển ${amount} cho ${toUser.username}`);
    await pushNotification(req, toUser._id, 'transfer_received', `Bạn đã nhận ${amount} từ ${fromUser.username}`);

    res.json({ fromBalance: fromUser.balance, toBalance: toUser.balance });
  })
);

// GET /api/wallet/:id/transactions
router.get(
  '/:id/transactions',
  auth,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const txs = await Transaction.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({ transactions: txs });
  })
);

module.exports = router;