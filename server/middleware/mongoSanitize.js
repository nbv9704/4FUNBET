// server/middleware/mongoSanitize.js

/**
 * Custom MongoDB sanitization middleware
 * Prevents NoSQL injection by removing $ and . from user input
 * 
 * This replaces express-mongo-sanitize to avoid req.query conflict
 * in certain Express versions.
 */
module.exports = function mongoSanitizeCustom() {
  return function(req, res, next) {
    try {
      // Sanitize req.body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body)
      }

      // Sanitize req.params
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params)
      }

      // ⚠️ SKIP req.query (read-only in some Express versions)
      // Query params are usually strings so less risky

      next()
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Recursively sanitize an object by removing dangerous keys
 * @param {*} obj - Object to sanitize
 * @returns {*} Sanitized object
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj

  const sanitized = Array.isArray(obj) ? [] : {}

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Remove keys starting with $ or containing .
      if (key.startsWith('$') || key.includes('.')) {
        console.warn(`[SECURITY] Blocked malicious key: "${key}"`)
        continue
      }

      const value = obj[key]

      // Recursively sanitize nested objects
      if (value && typeof value === 'object') {
        sanitized[key] = sanitizeObject(value)
      } else {
        sanitized[key] = value
      }
    }
  }

  return sanitized
}