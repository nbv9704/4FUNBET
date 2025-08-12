// server/routes/authRoutes.js
const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const Joi      = require('joi');
const User     = require('../models/User');
const auth     = require('../middleware/auth');

// Schema validation
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  usernameOrEmail: Joi.string().required(),
  password:        Joi.string().required(),
});

// Đăng ký: POST /api/auth/register
router.post('/register', async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { username, email, password } = req.body;

    // Kiểm tra trùng username hoặc email
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      if (existing.username === username) {
        return res.status(400).json({ error: 'Username đã tồn tại' });
      }
      if (existing.email === email) {
        return res.status(400).json({ error: 'Email đã tồn tại' });
      }
    }

    const salt     = await bcrypt.genSalt(10);
    const hashPass = await bcrypt.hash(password, salt);

    const user = new User({ username, email, password: hashPass });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Đăng nhập: POST /api/auth/login
router.post('/login', async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { usernameOrEmail, password } = req.body;
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    });
    if (!user) return res.status(400).json({ error: 'Tài khoản không tồn tại' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Mật khẩu không đúng' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('username email balance');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id:       user._id,
      username: user.username,
      email:    user.email,
      balance:  user.balance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/auth/me
router.patch('/me', auth, async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (username) user.username = username;
    if (email)    user.email    = email;
    await user.save();

    res.json({
      id:       user._id,
      username: user.username,
      email:    user.email,
      balance:  user.balance
    });
  } catch (err) {
    console.error(err);
    // Bắt lỗi duplicate key (username/email)
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.username) {
        return res.status(400).json({ error: 'Username đã tồn tại' });
      }
      if (err.keyPattern && err.keyPattern.email) {
        return res.status(400).json({ error: 'Email đã tồn tại' });
      }
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
