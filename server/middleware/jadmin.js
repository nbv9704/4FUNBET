// server/middleware/jadmin.js

module.exports = function(req, res, next) {
  const role = req.user.role;
  if (role === 'admin' || role === 'jadmin') return next();
  return res.status(403).json({ error: 'Chỉ admin hoặc junior admin mới thực hiện được' });
};
