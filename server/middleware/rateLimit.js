// server/middleware/rateLimit.js
const BUCKET = new Map();

/**
 * Simple sliding window rate limit
 * key = `${ip}:${userId||'-'}:${route}`
 */
module.exports = function rateLimit(options = {}) {
  const {
    windowMs = 10_000, // 10s window
    max = 20,          // max 20 req/window/key
    getKey = (req) => {
      const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim() || 'ip';
      const uid = (req.user && req.user.id) ? String(req.user.id) : '-';
      // route key: method + baseUrl + path pattern (removing params values)
      const route = (req.baseUrl || '') + (req.route ? req.route.path : req.path || '');
      return `${ip}:${uid}:${req.method}:${route}`;
    },
  } = options;

  return (req, res, next) => {
    try {
      const key = getKey(req);
      const now = Date.now();
      let bucket = BUCKET.get(key);
      if (!bucket) {
        bucket = { count: 1, resetAt: now + windowMs };
        BUCKET.set(key, bucket);
        return next();
      }
      if (now > bucket.resetAt) {
        bucket.count = 1;
        bucket.resetAt = now + windowMs;
        return next();
      }
      bucket.count++;
      if (bucket.count > max) {
        return res.status(429).json({ error: 'Too many requests, please slow down.', retryAfterMs: bucket.resetAt - now });
      }
      return next();
    } catch (e) {
      // fail-open
      return next();
    }
  };
};
