// server/validation/gameSchemas.js

const Joi = require('joi');

// Coinflip (already exists in gameRoutes, moved here)
const coinflipSchema = Joi.object({
  betAmount: Joi.number().min(1).required(),
  side: Joi.string().valid('heads', 'tails').required(),
  clientSeed: Joi.string().optional(),
});

// Dice (already exists, moved here)
const diceSchema = Joi.object({
  betAmount: Joi.number().min(1).required(),
  sides: Joi.number().valid(4, 6, 8, 10, 12, 20).default(6),
  guess: Joi.number().min(1).required(),
  clientSeed: Joi.string().optional(),
});

// Roulette (already exists, moved here)
const rouletteSchema = Joi.object({
  betAmount: Joi.number().min(5).required(),
  betType: Joi.string().valid('zero', 'range', 'color', 'number').required(),
  betValue: Joi.alternatives().try(
    Joi.string().valid('1-9', '10-18', '19-27', '28-36', 'red', 'black'),
    Joi.number().min(0).max(36)
  ).required(),
});

// Higher/Lower (already exists, moved here)
const higherLowerSchema = Joi.object({
  betAmount: Joi.number().min(1).required(),
  guess: Joi.string().valid('higher', 'lower').required(),
});

// Slots (already exists, moved here)
const slotsSchema = Joi.object({
  betAmount: Joi.number().min(1).required(),
});

// Lucky Five
const luckyFiveSchema = Joi.object({
  betAmount: Joi.number().min(1).required(),
  numbers: Joi.array().items(Joi.number().min(1).max(100)).length(5).required(),
  colors: Joi.array().items(Joi.string().valid('red', 'orange', 'yellow', 'green', 'blue')).length(5).required(),
});

// Dice Poker
const dicePokerSchema = Joi.object({
  betAmount: Joi.number().min(1).required(),
});

// Mines
const minesStartSchema = Joi.object({
  betAmount: Joi.number().min(1).required(),
});

const minesPickSchema = Joi.object({
  index: Joi.number().integer().min(0).max(224).required(), // 15x15 grid
});

// Tower
const towerStartSchema = Joi.object({
  betAmount: Joi.number().min(1).required(),
});

// Blackjack Dice
const blackjackDiceStartSchema = Joi.object({
  betAmount: Joi.number().min(5).required(),
});

module.exports = {
  coinflipSchema,
  diceSchema,
  rouletteSchema,
  higherLowerSchema,
  slotsSchema,
  luckyFiveSchema,
  dicePokerSchema,
  minesStartSchema,
  minesPickSchema,
  towerStartSchema,
  blackjackDiceStartSchema,
};