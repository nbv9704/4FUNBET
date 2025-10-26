// server/validation/pvpSchemas.js

const Joi = require('joi');

// Allowed games
const GAMES = ['coinflip', 'dice', 'blackjackdice', 'roulette', 'slots'];

// Create Room
const createRoomSchema = Joi.object({
  game: Joi.string().valid(...GAMES).default('coinflip'),
  maxPlayers: Joi.number().integer().min(2).max(6).default(2),
  betAmount: Joi.number().min(0).max(1000000).default(0),
  hostSide: Joi.string().valid('heads', 'tails').optional(),
  diceSides: Joi.number().valid(4, 6, 8, 10, 12, 20).default(6),
  requestId: Joi.string().optional(),
});

// Join Room (no body needed, roomId in params)
const joinRoomSchema = Joi.object({
  requestId: Joi.string().optional(),
});

// Ready
const readySchema = Joi.object({
  ready: Joi.boolean().default(true),
  requestId: Joi.string().optional(),
});

// Start Room
const startRoomSchema = Joi.object({
  requestId: Joi.string().optional(),
});

// Roll Dice (PvP)
const rollDiceSchema = Joi.object({
  requestId: Joi.string().optional(),
});

// Place Bet (legacy)
const placeBetSchema = Joi.object({
  amount: Joi.number().min(1).required(),
  choice: Joi.string().optional(),
  requestId: Joi.string().optional(),
});

// Finish Room (legacy)
const finishRoomSchema = Joi.object({
  winnerUserId: Joi.string().optional(),
  metadata: Joi.object().optional(),
  requestId: Joi.string().optional(),
});

// Invite
const inviteSchema = Joi.object({
  targetUserId: Joi.string().required(),
});

module.exports = {
  createRoomSchema,
  joinRoomSchema,
  readySchema,
  startRoomSchema,
  rollDiceSchema,
  placeBetSchema,
  finishRoomSchema,
  inviteSchema,
};