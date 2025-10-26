// client/src/app/game/slots/page.js
'use client'

import RequireAuth from '@/components/RequireAuth'
import { useState } from 'react'
import useApi from '@/hooks/useApi'
import { useUser } from '@/context/UserContext'
import { toast } from 'react-hot-toast'

// 9 symbols với emoji
const SYMBOLS = [
  { name: 'cherry', emoji: '🍒', multiplier: 1.25 },
  { name: 'lemon', emoji: '🍋', multiplier: 1.5 },
  { name: 'watermelon', emoji: '🍉', multiplier: 2 },
  { name: 'heart', emoji: '❤️', multiplier: 3 },
  { name: 'bell', emoji: '🔔', multiplier: 4 },
  { name: 'diamond', emoji: '💎', multiplier: 5 },
  { name: 'seven', emoji: '7️⃣', multiplier: 8 },
  { name: 'horseshoe', emoji: '🐴', multiplier: 10 },
  { name: 'money', emoji: '💰', multiplier: 20 }
]

function SlotsPage() {
  const { post } = useApi()
  const { updateBalance } = useUser()

  const [betAmount, setBetAmount] = useState(1)
  const [spinning, setSpinning] = useState(false)
  const [grid, setGrid] = useState([
    [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
    [SYMBOLS[3], SYMBOLS[4], SYMBOLS[5]],
    [SYMBOLS[6], SYMBOLS[7], SYMBOLS[8]]
  ])
  const [result, setResult] = useState(null)

  const handleSpin = async (e) => {
    e.preventDefault()

    if (betAmount <= 0) {
      toast.error('Bet must be > 0')
      return
    }

    setSpinning(true)
    setResult(null)

    try {
      const data = await post('/game/slots', { betAmount })

      // Animate spinning
      setTimeout(() => {
        // Parse emoji grid từ server response
        const serverGrid = data.grid || []
        const parsedGrid = serverGrid.map(row =>
          row.map(emoji => SYMBOLS.find(s => s.emoji === emoji) || SYMBOLS[0])
        )

        setGrid(parsedGrid)
        setResult(data)
        updateBalance(data.balance)
        setSpinning(false)

        if (data.win) {
          toast.success(`🎉 You win! ${data.totalMultiplier}x - Payout: ${data.payout}`)
        } else {
          toast.error('😢 No winning lines this time')
        }
      }, 2000) // Match animation duration
    } catch (err) {
      setSpinning(false)
      // Error toast handled by useApi
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Slots</h1>

      {/* Slots Machine */}
      <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-3xl p-6 shadow-2xl mb-6">
        {/* Display */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-3 gap-2">
            {grid.map((row, r) =>
              row.map((symbol, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`bg-white dark:bg-gray-800 rounded-xl h-24 flex items-center justify-center text-5xl ${
                    spinning ? 'animate-reel-spin' : ''
                  }`}
                  style={{
                    animationDelay: `${c * 0.1}s`
                  }}
                >
                  {spinning ? '❓' : symbol.emoji}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Result Display */}
        {result && !spinning && (
          <div className="bg-gray-900 rounded-xl p-4 text-white text-center mb-4">
            <div className="text-2xl font-bold">
              {result.win ? '🎊 WIN!' : 'Try Again'}
            </div>
            {result.win && (
              <>
                <div className="text-lg mt-2">Multiplier: {result.totalMultiplier}x</div>
                <div className="text-xl font-bold text-yellow-400">Payout: {result.payout}</div>
                {result.winningLines && result.winningLines.length > 0 && (
                  <div className="text-sm opacity-80 mt-2">
                    {result.winningLines.length} winning line{result.winningLines.length > 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Bet Controls */}
        <form onSubmit={handleSpin} className="space-y-3">
          <div className="bg-gray-900 rounded-xl p-3">
            <label className="block mb-2 font-medium text-white text-sm">Bet Amount:</label>
            <input
              type="number"
              min="1"
              value={betAmount}
              onChange={(e) => setBetAmount(+e.target.value)}
              className="w-full border rounded-xl px-4 py-2 bg-gray-800 text-white"
              disabled={spinning}
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-2xl font-bold text-xl hover:from-red-600 hover:to-pink-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
            disabled={spinning}
          >
            {spinning ? '🎰 SPINNING...' : '🎰 SPIN'}
          </button>
        </form>
      </div>

      {/* Paytable */}
      <div className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold mb-3">Paytable (3-of-a-kind)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {SYMBOLS.map(s => (
            <div key={s.name} className="flex items-center justify-between p-2 rounded border">
              <span className="text-2xl">{s.emoji}</span>
              <span className="font-semibold">{s.multiplier}x</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs opacity-70">
          <div>Win lines: 3 rows + 3 columns + 2 diagonals = 8 total</div>
          <div>Multiple lines multiply your payout!</div>
        </div>
      </div>
    </div>
  )
}

export default RequireAuth(SlotsPage)