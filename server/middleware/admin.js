// server/middleware/admin.js

module.exports = function(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Chỉ admin mới thực hiện được' });
  next();
};
