// server/models/PvpRoom.js
const mongoose = require('mongoose')

const PvpBetSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:    { type: Number, min: 0, default: 0 },
    choice:    { type: String }, // game-specific
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const PvpPlayerSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    ready:    { type: Boolean, default: false },
    // side cho các mode cần pre-pick (coinflip, v.v.)
    side:     { type: String, default: null }, // 'heads' | 'tails' | null
  },
  { _id: false }
)

// ✅ FIX: Remove duplicate index declaration
const PvpRoomSchema = new mongoose.Schema(
  {
    roomId:       { type: String, required: true, unique: true }, // ✅ Removed index: true
    game:         { type: String, required: true, default: 'coinflip' },
    betAmount:    { type: Number, min: 0, default: 0 },
    maxPlayers:   { type: Number, default: 2, min: 2, max: 6 },
    players:      { type: [PvpPlayerSchema], default: [] },
    bets:         { type: [PvpBetSchema], default: [] },
    status:       { type: String, enum: ['waiting','active','finished','cancelled'], default: 'waiting', index: true },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    winnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata:     { type: mongoose.Schema.Types.Mixed }, // seedHash, serverSeed (ẩn), clientSeed, flipResult, ...
  },
  { timestamps: true }
)

// 🔽 Index quan trọng cho list/cron
PvpRoomSchema.index({ status: 1, game: 1, createdAt: -1 })
PvpRoomSchema.index({ 'metadata.pendingCoin.revealAt': 1 }, { sparse: true })
PvpRoomSchema.index({ 'metadata.pending.advanceAt': 1 }, { sparse: true })
PvpRoomSchema.index({ updatedAt: -1 })
PvpRoomSchema.index({ roomId: 1 }, { unique: true }) // ✅ Only one roomId index

module.exports = mongoose.models.PvpRoom || mongoose.model('PvpRoom', PvpRoomSchema)