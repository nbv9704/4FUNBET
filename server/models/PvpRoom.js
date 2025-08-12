// server/models/PvpRoom.js
const mongoose = require('mongoose')

const PvpBetSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:    { type: Number, min: 0, default: 0 },
    choice:    { type: String }, // game-specific (e.g., heads/tails, red/black)
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const PvpPlayerSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    ready:    { type: Boolean, default: false },
  },
  { _id: false }
)

const PvpRoomSchema = new mongoose.Schema(
  {
    roomId:       { type: String, required: true, unique: true, index: true },
    game:         { type: String, required: true, default: 'coinflip' },
    betAmount:    { type: Number, min: 0, default: 0 }, // base bet for this room
    maxPlayers:   { type: Number, default: 2, min: 2, max: 6 },
    players:      { type: [PvpPlayerSchema], default: [] },
    bets:         { type: [PvpBetSchema], default: [] },
    status:       { type: String, enum: ['waiting','active','finished','cancelled'], default: 'waiting', index: true },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    winnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata:     { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
)

module.exports = mongoose.models.PvpRoom || mongoose.model('PvpRoom', PvpRoomSchema)
