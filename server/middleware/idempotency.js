// server/middleware/idempotency.js
const STORE = new Map();

/**
 * Idempotency guard for POST actions that must execute once (start/roll/finish)
 * - Accepts key from body.requestId or header x-idempotency-key
 * - TTL default 60s
 */
module.exports = function idempotency(options = {}) {
  const { ttlMs = 60_000, namespace = 'pvp' } = options;

  return async function (req, res, next) {
    const keyRaw = (req.body && (req.body.requestId || req.body.idempotencyKey)) ||
                   req.headers['x-idempotency-key'];
    if (!keyRaw) return next(); // if no key, we don't block (still rate-limited outside)
    const userId = req.user?.id ? String(req.user.id) : '-';
    const key = `${namespace}:${userId}:${keyRaw}`;
    const now = Date.now();

    // Cleanup old entries occasionally
    if (STORE.size > 2000 && Math.random() < 0.01) {
      const entries = Array.from(STORE.entries());
      for (const [k, v] of entries) {
        if (now > v.expireAt) STORE.delete(k);
      }
    }

    const existed = STORE.get(key);
    if (existed && now < existed.expireAt) {
      // Already processed — return cached response if any
      if (existed.response) {
        return res.status(existed.response.status).json(existed.response.body);
      }
      // Or reject to prevent re-execution
      return res.status(409).json({ error: 'Duplicate request' });
    }

    // Wrap res.json to cache one response
    const origJson = res.json.bind(res);
    const origStatus = res.status.bind(res);

    let statusCode = 200;
    res.status = (code) => { statusCode = code; return origStatus(code); };
    res.json = (body) => {
      STORE.set(key, { expireAt: now + ttlMs, response: { status: statusCode, body } });
      return origJson(body);
    };

    return next();
  };
};
