// client/src/data/games.js
export const GAMES = [
  { id: "coinflip",     name: "Coinflip",      minBet: 1, supports: ["solo", "battle"], icon: "🪙" },
  { id: "dice",         name: "Dice",          minBet: 1, supports: ["solo", "battle"], icon: "🎲" },
  { id: "blackjackdice",name: "Blackjack Dice",minBet: 5, supports: ["solo"],           icon: "🃏" },
  { id: "roulette",     name: "Roulette",      minBet: 5, supports: ["solo"],           icon: "🎡" },
  { id: "higherlower",  name: "Higher/Lower",  minBet: 1, supports: ["solo"],           icon: "⬆️⬇️" },
  { id: "slots",        name: "Slots",         minBet: 1, supports: ["solo"],           icon: "🎰" },
  // Add more as needed
];
