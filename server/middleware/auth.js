// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

module.exports = function(req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Không tìm thấy token',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      error: 'Token không hợp lệ',
      code: 'AUTH_TOKEN_INVALID'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 🔐 SECURITY: Validate ObjectId format
    if (decoded.id && !mongoose.isValidObjectId(decoded.id)) {
      return res.status(401).json({ 
        error: 'Token không hợp lệ',
        code: 'AUTH_TOKEN_INVALID_USER_ID'
      });
    }
    
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token hết hạn',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      error: 'Token hết hạn hoặc không hợp lệ',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
};