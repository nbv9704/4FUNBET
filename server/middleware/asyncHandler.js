// server/middleware/asyncHandler.js

/**
 * Wrapper for async route handlers to automatically catch errors
 * and forward them to the error handling middleware.
 * 
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     const users = await User.find()
 *     res.json(users)
 *   }))
 */

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;