// server/utils/random.js

// Nếu muốn dùng seedable random cho provably fair, cài thêm: npm install seedrandom
const seedrandom = require('seedrandom');
let rng = seedrandom();  // khởi tạo với seed mặc định

/**
 * Returns a random integer between min and max, inclusive.
 * @param {number} min 
 * @param {number} max 
 */
function randomInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Set a new seed for the RNG.
 * @param {string|number} seed 
 */
function setSeed(seed) {
  rng = seedrandom(seed);
}

module.exports = { randomInt, setSeed };
