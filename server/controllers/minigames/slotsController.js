// server/controllers/minigames/slotsController.js
const User                  = require('../../models/User');
const { randomInt }         = require('../../utils/random');
const { recordGameHistory } = require('../../utils/history');

// Danh sách 9 symbol và multiplier (2×) cho 3-of-a-kind
const SYMBOLS = [
  { name: 'cherry',     emoji: '🍒', multiplier: 1.25 },
  { name: 'lemon',      emoji: '🍋', multiplier: 1.5  },
  { name: 'watermelon', emoji: '🍉', multiplier: 2    },
  { name: 'heart',      emoji: '❤️', multiplier: 3    },
  { name: 'bell',       emoji: '🔔', multiplier: 4    },
  { name: 'diamond',    emoji: '💎', multiplier: 5    },
  { name: 'seven',      emoji: '7️⃣', multiplier: 8    },
  { name: 'horseshoe',  emoji: '🐴', multiplier: 10   },
  { name: 'money',      emoji: '💰', multiplier: 20   }
];

// Tất cả đường cần kiểm tra 3-of-a-kind
const LINES = [
  [[0,0],[0,1],[0,2]],
  [[1,0],[1,1],[1,2]],
  [[2,0],[2,1],[2,2]],
  [[0,0],[1,0],[2,0]],
  [[0,1],[1,1],[2,1]],
  [[0,2],[1,2],[2,2]],
  [[0,0],[1,1],[2,2]],
  [[0,2],[1,1],[2,0]]
];

/**
 * POST /api/game/slots
 * Body: { betAmount: number }
 */
exports.slots = async (req, res) => {
  try {
    const userId       = req.user.id;
    const { betAmount } = req.body;

    // 1. Validate betAmount
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid betAmount' });
    }

    // 2. Load user & check balance
    const user = await User.findById(userId);
    if (!user)    return res.status(404).json({ error: 'User not found' });
    if (user.balance < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 3. Trừ stake ngay
    user.balance -= betAmount;

    // 4. Tạo ma trận 3x3
    const grid = [[], [], []];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        grid[r][c] = SYMBOLS[randomInt(0, SYMBOLS.length - 1)];
      }
    }

    // 5. Kiểm tra tất cả đường LINES và cộng multiplier
    let totalMultiplier = 0;
    const winningLines  = [];

    LINES.forEach(line => {
      const [a,b,c] = line;
      const symA = grid[a[0]][a[1]].name;
      const symB = grid[b[0]][b[1]].name;
      const symC = grid[c[0]][c[1]].name;
      if (symA === symB && symA === symC) {
        totalMultiplier += grid[a[0]][a[1]].multiplier;
        winningLines.push(line);
      }
    });

    // 6. Tính payout và cập nhật balance
    const payout = betAmount * totalMultiplier;
    user.balance += payout;
    await user.save();

    // 7. Record to game history
    await recordGameHistory({
      userId,
      game: 'slots',
      betAmount,
      outcome: totalMultiplier > 0 ? 'win' : 'lose',
      payout
    });

    // 8. Chuẩn bị response (thêm `amount` cho withNotification)
    const emojiGrid = grid.map(row => row.map(cell => cell.emoji));
    const win = totalMultiplier > 0;

    return res.json({
      grid: emojiGrid,
      win,
      totalMultiplier,
      payout,
      amount: win ? payout : betAmount, // ← thêm để wrapper đọc
      balance: user.balance,
      winningLines
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
