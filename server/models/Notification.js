// server/models/Notification.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, required: true },   // e.g. 'pvp_invite'
  message:   { type: String, required: true },   // human-readable message
  read:      { type: Boolean, default: false },
  // Optional: deep link + structured data for client actions
  link:      { type: String },                   // e.g. '/game/battle/room/xxxx'
  metadata:  { type: Schema.Types.Mixed },       // e.g. { roomId, path, game, betAmount, fromUserId, fromUserName }
  createdAt: { type: Date, default: Date.now }
});

// Sort timeline by newest first
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
