// server/routes/userRoutes.js
const express    = require('express');
const bcrypt     = require('bcryptjs');
const router     = express.Router();

const auth       = require('../middleware/auth');
const adminOnly  = require('../middleware/admin');
const validateObjectId = require('../middleware/validateObjectId');
const User       = require('../models/User');
const { AppError } = require('../utils/AppError');

// ADMIN: Get all users
router.get('/', auth, adminOnly, async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET current user (self)
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET any user's username (for transfer confirm)
router.get('/:id', auth, validateObjectId('id'), async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id).select('username');
    if (!u) throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    res.json({ username: u.username });
  } catch (err) {
    next(err);
  }
});

// UPDATE profile (self)
router.patch('/me', auth, async (req, res, next) => {
  try {
    const { username, email, avatar, dateOfBirth, currentPassword } = req.body;

    if (!currentPassword) {
      throw new AppError('INVALID_INPUT', 400, 'Current password is required');
    }

    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('INVALID_PASSWORD', 400, 'Current password is incorrect');
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

    await user.save();

    const { password, ...safeUser } = user.toObject();
    res.json(safeUser);
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.username) {
        return next(new AppError('DUPLICATE_USERNAME', 400, 'Username already exists'));
      }
      if (err.keyPattern?.email) {
        return next(new AppError('DUPLICATE_EMAIL', 400, 'Email already exists'));
      }
    }
    next(err);
  }
});

// CHANGE password (self)
router.post('/me/password', auth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      throw new AppError('INVALID_INPUT', 400, 'Old and new passwords are required');
    }
    
    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'User not found');

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) throw new AppError('INVALID_PASSWORD', 400, 'Old password is incorrect');

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;