// server/middleware/validateObjectId.js
const mongoose = require('mongoose');

/**
 * Middleware để validate MongoDB ObjectId từ route params
 * 
 * Usage:
 *   router.get('/user/:id', validateObjectId('id'), (req, res) => {...})
 *   router.get('/room/:roomId', validateObjectId('roomId'), (req, res) => {...})
 * 
 * @param {string} paramName - Tên param cần validate (default: 'id')
 * @returns {Function} Express middleware
 */
module.exports = function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({ 
        error: `Missing ${paramName} parameter`,
        code: 'MISSING_PARAMETER'
      });
    }
    
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ 
        error: `Invalid ${paramName} format`,
        code: 'INVALID_OBJECT_ID',
        meta: { paramName, value: id }
      });
    }
    
    next();
  };
};