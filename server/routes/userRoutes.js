// server/routes/userRoutes.js
const express    = require('express');
const bcrypt     = require('bcryptjs');
const router     = express.Router();

const auth       = require('../middleware/auth');
const adminOnly  = require('../middleware/admin');
const jadminOnly = require('../middleware/jadmin');
const User       = require('../models/User');

// ADMIN: Get all users
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET current user (self)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User
      .findById(req.user.id)
      .select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET any user's username (for transfer confirm)
router.get('/:id', auth, async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('username');
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({ username: u.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE profile (self)
// PATCH /api/user/me
router.patch('/me', auth, async (req, res) => {
  try {
    const { username, email, avatar, dateOfBirth, currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

    await user.save();

    const { password, ...safeUser } = user.toObject();
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      if (err.keyPattern?.username) return res.status(400).json({ error: 'Username đã tồn tại' });
      if (err.keyPattern?.email) return res.status(400).json({ error: 'Email đã tồn tại' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// CHANGE password (self)
// POST /api/user/me/password
router.post('/me/password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ error: 'Old password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
