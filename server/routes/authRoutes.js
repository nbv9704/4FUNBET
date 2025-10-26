// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { AppError } = require('../utils/AppError');
const { ErrorCodes, ErrorMessages } = require('../utils/ErrorCodes');
const asyncHandler = require('../middleware/asyncHandler');
const { authLimiter } = require('../middleware/rateLimitStrict');

// Schema validation
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  usernameOrEmail: Joi.string().required(),
  password: Joi.string().required(),
});

// ✅ Apply strict rate limit
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      throw new AppError(ErrorCodes.INVALID_INPUT, 400, error.details[0].message);
    }

    const { username, email, password } = req.body;

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      if (existing.username === username) {
        throw new AppError(ErrorCodes.USER_DUPLICATE_USERNAME, 400, ErrorMessages[ErrorCodes.USER_DUPLICATE_USERNAME]);
      }
      if (existing.email === email) {
        throw new AppError(ErrorCodes.USER_DUPLICATE_EMAIL, 400, ErrorMessages[ErrorCodes.USER_DUPLICATE_EMAIL]);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashPass = await bcrypt.hash(password, salt);

    const user = new User({ username, email, password: hashPass });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token });
  })
);

// ✅ Apply strict rate limit
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      throw new AppError(ErrorCodes.INVALID_INPUT, 400, error.details[0].message);
    }

    const { usernameOrEmail, password } = req.body;
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });
    if (!user) {
      throw new AppError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 400, ErrorMessages[ErrorCodes.AUTH_INVALID_CREDENTIALS]);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 400, ErrorMessages[ErrorCodes.AUTH_INVALID_CREDENTIALS]);
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('username email balance');
    if (!user) throw new AppError(ErrorCodes.USER_NOT_FOUND, 404, ErrorMessages[ErrorCodes.USER_NOT_FOUND]);

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
    });
  })
);

// PATCH /api/auth/me
router.patch(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    const { username, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) throw new AppError(ErrorCodes.USER_NOT_FOUND, 404, ErrorMessages[ErrorCodes.USER_NOT_FOUND]);

    if (username) user.username = username;
    if (email) user.email = email;

    try {
      await user.save();
    } catch (err) {
      // Handle duplicate key errors
      if (err.code === 11000) {
        if (err.keyPattern && err.keyPattern.username) {
          throw new AppError(ErrorCodes.USER_DUPLICATE_USERNAME, 400, ErrorMessages[ErrorCodes.USER_DUPLICATE_USERNAME]);
        }
        if (err.keyPattern && err.keyPattern.email) {
          throw new AppError(ErrorCodes.USER_DUPLICATE_EMAIL, 400, ErrorMessages[ErrorCodes.USER_DUPLICATE_EMAIL]);
        }
      }
      throw err;
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
    });
  })
);

module.exports = router;