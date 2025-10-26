// server/middleware/rateLimitStrict.js
const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiters for sensitive endpoints
 */

// Auth endpoints: Login/Register
// 5 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_AUTH',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests from counting
  skipSuccessfulRequests: true,
  // Custom key generator (IP + endpoint)
  keyGenerator: (req) => {
    return `${req.ip}:${req.path}`;
  }
});

// Wallet transfer endpoint
// 10 transfers per 5 minutes per user
const transferLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    error: 'Too many transfer attempts, please slow down',
    code: 'RATE_LIMIT_TRANSFER',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by user ID if authenticated
  keyGenerator: (req) => {
    return req.user?.id ? String(req.user.id) : req.ip;
  }
});

// PvP action endpoints (start/roll/finish)
// 20 actions per 1 minute per user
const pvpActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    error: 'Too many PvP actions, please slow down',
    code: 'RATE_LIMIT_PVP',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id ? String(req.user.id) : req.ip;
  }
});

// Room creation: 5 rooms per 10 minutes per user
const createRoomLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    error: 'Too many rooms created, please wait before creating more',
    code: 'RATE_LIMIT_CREATE_ROOM',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id ? String(req.user.id) : req.ip;
  }
});

module.exports = {
  authLimiter,
  transferLimiter,
  pvpActionLimiter,
  createRoomLimiter
};