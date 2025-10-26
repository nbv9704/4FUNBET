// server/routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const asyncHandler = require('../middleware/asyncHandler');
const withNotification = require('../utils/withNotification');

// ✅ Import validation schemas (centralized)
const {
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
} = require('../validation/gameSchemas');

// Import controllers
const { coinflip } = require('../controllers/minigames/coinflipController');
const { slots } = require('../controllers/minigames/slotsController');
const { roulette } = require('../controllers/minigames/rouletteController');
const { luckyFive } = require('../controllers/minigames/luckyFiveController');
const { dice } = require('../controllers/minigames/diceController');
const { dicePoker } = require('../controllers/minigames/dicePokerController');
const { higherLower } = require('../controllers/minigames/higherLowerController');
const { startMines, pickMines } = require('../controllers/minigames/minesController');
const { startTower, ascendTower, cashoutTower } = require('../controllers/minigames/towerController');
const {
  startBlackjackDice,
  hitBlackjackDice,
  standBlackjackDice,
  checkBlackjackDice,
  abandonBlackjackDice,
  resumeBlackjackDice,
} = require('../controllers/minigames/blackjackDiceController');

// ✅ Apply rate limit to all game endpoints
const { pvpActionLimiter } = require('../middleware/rateLimitStrict');
router.use(pvpActionLimiter);

// ✅ Wrap controllers with asyncHandler + validation
router.post('/coinflip', auth, validateRequest(coinflipSchema, 'body'), asyncHandler(withNotification(coinflip, 'Coinflip')));
router.post('/roulette', auth, validateRequest(rouletteSchema, 'body'), asyncHandler(withNotification(roulette, 'Roulette')));
router.post('/dice', auth, validateRequest(diceSchema, 'body'), asyncHandler(withNotification(dice, 'Dice')));
router.post('/higherlower', auth, validateRequest(higherLowerSchema, 'body'), asyncHandler(withNotification(higherLower, 'Higher Lower')));
router.post('/slots', auth, validateRequest(slotsSchema, 'body'), asyncHandler(withNotification(slots, 'Slots')));
router.post('/luckyfive', auth, validateRequest(luckyFiveSchema, 'body'), asyncHandler(withNotification(luckyFive, 'Lucky Five')));
router.post('/dicepoker', auth, validateRequest(dicePokerSchema, 'body'), asyncHandler(withNotification(dicePoker, 'Dice Poker')));

router.post('/mines/start', auth, validateRequest(minesStartSchema, 'body'), asyncHandler(startMines));
router.post('/mines/pick', auth, validateRequest(minesPickSchema, 'body'), asyncHandler(pickMines));

router.post('/tower/start', auth, validateRequest(towerStartSchema, 'body'), asyncHandler(startTower));
router.post('/tower/ascend', auth, asyncHandler(ascendTower));
router.post('/tower/cashout', auth, asyncHandler(cashoutTower));

router.post('/blackjackdice/start', auth, validateRequest(blackjackDiceStartSchema, 'body'), asyncHandler(startBlackjackDice));
router.post('/blackjackdice/hit', auth, asyncHandler(withNotification(hitBlackjackDice, 'Blackjack Dice')));
router.post('/blackjackdice/stand', auth, asyncHandler(withNotification(standBlackjackDice, 'Blackjack Dice')));
router.post('/blackjackdice/check', auth, asyncHandler(checkBlackjackDice));
router.post('/blackjackdice/abandon', auth, asyncHandler(abandonBlackjackDice));
router.post('/blackjackdice/resume', auth, asyncHandler(resumeBlackjackDice));

module.exports = router;