// server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'Không tìm thấy token' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token không hợp lệ' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token hết hạn' });
    }
    return res.status(401).json({ error: 'Token hết hạn hoặc không hợp lệ' });
  }
};