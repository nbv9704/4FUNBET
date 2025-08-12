// server/routes/historyRoutes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { getHistory } = require('../controllers/historyController');

// GET /api/user/:id/history
router.get('/:id/history', auth, getHistory);

module.exports = router;