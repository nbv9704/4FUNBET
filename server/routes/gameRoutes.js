// server/routes/gameRoutes.js
const express            = require('express')
const router             = express.Router()
const auth               = require('../middleware/auth')
const withNotification   = require('../utils/withNotification')

const { coinflip }       = require('../controllers/minigames/coinflipController')
const { slots }          = require('../controllers/minigames/slotsController')
const { roulette }       = require('../controllers/minigames/rouletteController')
const { luckyFive }      = require('../controllers/minigames/luckyFiveController')
const { dice }           = require('../controllers/minigames/diceController')
const { dicePoker }      = require('../controllers/minigames/dicePokerController')
const { higherLower }    = require('../controllers/minigames/higherLowerController')
const { startMines, pickMines } = require('../controllers/minigames/minesController')
const { startTower, ascendTower, cashoutTower } = require('../controllers/minigames/towerController')
const {
  startBlackjackDice,
  hitBlackjackDice,
  standBlackjackDice,
  checkBlackjackDice,
  abandonBlackjackDice,
  resumeBlackjackDice
} = require('../controllers/minigames/blackjackDiceController')

// Game modes with win/loss notifications
router.post('/coinflip',    auth, withNotification(coinflip,    'Coinflip'))
router.post('/roulette',    auth, withNotification(roulette,    'Roulette'))
router.post('/luckyfive',   auth, withNotification(luckyFive,   'Lucky Five'))
router.post('/dice',        auth, withNotification(dice,        'Dice'))
router.post('/dicepoker',   auth, withNotification(dicePoker,   'Dice Poker'))
router.post('/higherlower', auth, withNotification(higherLower, 'Higher Lower'))
router.post('/slots',       auth, withNotification(slots,       'Slots'))

// Other game endpoints (no automatic win/loss notification)
router.post('/mines/start',   auth, startMines)
router.post('/mines/pick',    auth, pickMines)

router.post('/tower/start',   auth, startTower)
router.post('/tower/ascend',  auth, ascendTower)
router.post('/tower/cashout', auth, cashoutTower)

// Blackjack Dice
router.post('/blackjackdice/start',   auth, startBlackjackDice)
// 👇 BỌC 2 endpoint kết thúc ván để bắn notification
router.post('/blackjackdice/hit',     auth, withNotification(hitBlackjackDice,   'Blackjack Dice'))
router.post('/blackjackdice/stand',   auth, withNotification(standBlackjackDice, 'Blackjack Dice'))
router.post('/blackjackdice/check',   auth, checkBlackjackDice)
router.post('/blackjackdice/abandon', auth, abandonBlackjackDice)
router.post('/blackjackdice/resume',  auth, resumeBlackjackDice)

module.exports = router
