// client/src/app/game/higherlower/page.js
'use client'

import RequireAuth from '@/components/RequireAuth'
import { useState, useEffect } from 'react'
import useApi from '@/hooks/useApi'
import { useUser } from '@/context/UserContext'
import { toast } from 'react-hot-toast'

function HigherLowerPage() {
  const { post } = useApi()
  const { updateBalance } = useUser()

  const [betAmount, setBetAmount] = useState(1)
  const [currentNumber, setCurrentNumber] = useState(10)
  const [nextNumber, setNextNumber] = useState(null)
  const [streak, setStreak] = useState(0)
  const [history, setHistory] = useState([])
  const [guessing, setGuessing] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const handleGuess = async (guess) => {
    if (betAmount <= 0) {
      toast.error('Bet must be > 0')
      return
    }

    setGuessing(true)
    setShowResult(false)

    try {
      const data = await post('/game/higherlower', { betAmount, guess })

      // Animate number reveal
      setTimeout(() => {
        setNextNumber(data.result)
        setShowResult(true)
        updateBalance(data.balance)

        if (data.tie) {
          toast(`🤝 It's a tie! Both were ${data.initial}`, { icon: 'ℹ️' })
          setStreak(0)
          setHistory(prev => [...prev, { from: data.initial, to: data.result, guess, outcome: 'tie' }].slice(-10))
        } else if (data.win) {
          toast.success(`🎉 Correct! ${data.initial} → ${data.result}`)
          setStreak(data.streak)
          setHistory(prev => [...prev, { from: data.initial, to: data.result, guess, outcome: 'win' }].slice(-10))
        } else {
          toast.error(`😢 Wrong! ${data.initial} → ${data.result}`)
          setStreak(0)
          setHistory(prev => [...prev, { from: data.initial, to: data.result, guess, outcome: 'lose' }].slice(-10))
        }

        // Prepare for next round
        setTimeout(() => {
          setCurrentNumber(data.result)
          setNextNumber(null)
          setShowResult(false)
          setGuessing(false)
        }, 2000)
      }, 1500)
    } catch (err) {
      setGuessing(false)
      setShowResult(false)
      // Error toast handled by useApi
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Higher or Lower</h1>

      {/* Streak Display */}
      {streak > 0 && (
        <div className="mb-4 p-4 rounded-xl border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            🔥 {streak} WIN STREAK! 🔥
          </div>
          <div className="text-sm opacity-80 mt-1">
            Current multiplier: {0.5 + streak * 0.5}x
          </div>
        </div>
      )}

      {/* Game Board */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-8 shadow-2xl mb-6">
        {/* Current Number */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 mb-6 text-center">
          <div className="text-sm opacity-70 mb-2">Current Number</div>
          <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {currentNumber}
          </div>
        </div>

        {/* Next Number (when revealed) */}
        {showResult && nextNumber !== null && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 mb-6 text-center animate-pulse">
            <div className="text-sm opacity-70 mb-2">Next Number</div>
            <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
              {nextNumber}
            </div>
          </div>
        )}

        {/* Bet Amount */}
        <div className="bg-white/20 backdrop-blur rounded-xl p-4 mb-6">
          <label className="block mb-2 font-medium text-white text-sm">Bet Amount:</label>
          <input
            type="number"
            min="1"
            value={betAmount}
            onChange={(e) => setBetAmount(+e.target.value)}
            className="w-full border rounded-xl px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            disabled={guessing}
          />
        </div>

        {/* Guess Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleGuess('lower')}
            disabled={guessing}
            className="px-8 py-6 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl font-bold text-2xl hover:from-red-600 hover:to-red-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            ⬇️ LOWER
          </button>
          <button
            onClick={() => handleGuess('higher')}
            disabled={guessing}
            className="px-8 py-6 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl font-bold text-2xl hover:from-green-600 hover:to-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            ⬆️ HIGHER
          </button>
        </div>

        {guessing && (
          <div className="mt-4 text-center text-white text-lg font-semibold animate-pulse">
            Revealing...
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-2xl border p-4">
          <h2 className="text-lg font-semibold mb-3">Recent History</h2>
          <div className="space-y-2">
            {[...history].reverse().map((h, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  h.outcome === 'win'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300'
                    : h.outcome === 'lose'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{h.from}</span>
                  <span className="text-sm opacity-70">
                    {h.guess === 'higher' ? '⬆️' : '⬇️'}
                  </span>
                  <span className="text-2xl font-bold">{h.to}</span>
                </div>
                <div className="text-lg font-semibold">
                  {h.outcome === 'win' ? '✅' : h.outcome === 'lose' ? '❌' : '🤝'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      <div className="mt-6 rounded-2xl border p-4 text-sm opacity-80">
        <h3 className="font-semibold mb-2">How to Play:</h3>
        <ul className="space-y-1 list-disc list-inside">
          <li>Numbers range from 1 to 20</li>
          <li>Guess if the next number will be HIGHER or LOWER</li>
          <li>Build a win streak for bonus multipliers (+0.5x per win)</li>
          <li>Ties reset your streak but refund your bet</li>
          <li>Maximum multiplier increases with your streak!</li>
        </ul>
      </div>
    </div>
  )
}

export default RequireAuth(HigherLowerPage)