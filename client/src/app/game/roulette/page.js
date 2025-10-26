// client/src/app/game/roulette/page.js
'use client'

import RequireAuth from '@/components/RequireAuth'
import { useState } from 'react'
import useApi from '@/hooks/useApi'
import { useUser } from '@/context/UserContext'
import { toast } from 'react-hot-toast'

// Số trên bánh xe (European style: 0-36)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

// Màu sắc (0 = green, odd = red, even = black)
const getColor = (num) => {
  if (num === 0) return 'green'
  return num % 2 === 0 ? 'black' : 'red'
}

// Ranges cho betting
const RANGES = ['1-9', '10-18', '19-27', '28-36']

function RoulettePage() {
  const { post } = useApi()
  const { updateBalance } = useUser()

  const [betAmount, setBetAmount] = useState(5)
  const [betType, setBetType] = useState('color') // 'zero' | 'range' | 'color' | 'number'
  const [betValue, setBetValue] = useState('red') // red/black | range | number
  
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [spinDegrees, setSpinDegrees] = useState(0)

  const handleSpin = async (e) => {
    e.preventDefault()
    
    if (betAmount <= 0) {
      toast.error('Bet must be > 0')
      return
    }

    // Validate betValue
    if (betType === 'range' && !RANGES.includes(betValue)) {
      toast.error('Invalid range')
      return
    }
    if (betType === 'color' && !['red', 'black'].includes(betValue)) {
      toast.error('Invalid color')
      return
    }
    if (betType === 'number') {
      const num = parseInt(betValue)
      if (isNaN(num) || num < 0 || num > 36) {
        toast.error('Number must be 0-36')
        return
      }
    }

    setSpinning(true)
    setResult(null)

    try {
      const data = await post('/game/roulette', {
        betAmount,
        betType,
        betValue: betType === 'number' ? parseInt(betValue) : betValue
      })

      // Animation: spin wheel
      const resultNum = data.result?.number
      const idx = WHEEL_NUMBERS.indexOf(resultNum)
      const segmentDeg = 360 / WHEEL_NUMBERS.length
      const targetDeg = idx * segmentDeg
      
      // Spin 5 full rotations + target position
      const finalDeg = 360 * 5 + targetDeg
      setSpinDegrees(finalDeg)

      setTimeout(() => {
        setResult(data.result)
        updateBalance(data.balance)
        setSpinning(false)

        if (data.win) {
          toast.success(`🎉 You win! ${data.result.number} (${data.result.color})`)
        } else {
          toast.error(`😢 You lose. ${data.result.number} (${data.result.color})`)
        }
      }, 3000) // Match animation duration
    } catch (err) {
      setSpinning(false)
      // Error toast handled by useApi
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Roulette</h1>

      {/* Wheel */}
      <div className="flex justify-center mb-8">
        <div className="relative w-64 h-64">
          {/* Wheel SVG */}
          <svg
            viewBox="0 0 200 200"
            className={`w-full h-full ${spinning ? 'animate-wheel-spin' : ''}`}
            style={{
              transform: `rotate(${spinDegrees}deg)`,
              transition: spinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
            }}
          >
            {WHEEL_NUMBERS.map((num, idx) => {
              const angle = (idx * 360) / WHEEL_NUMBERS.length
              const color = getColor(num)
              const fillColor = color === 'green' ? '#10b981' : color === 'red' ? '#ef4444' : '#1f2937'
              
              return (
                <g key={idx} transform={`rotate(${angle} 100 100)`}>
                  <path
                    d="M 100 100 L 100 10 A 90 90 0 0 1 109.7 10.5 Z"
                    fill={fillColor}
                    stroke="white"
                    strokeWidth="0.5"
                  />
                  <text
                    x="100"
                    y="25"
                    textAnchor="middle"
                    fill="white"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {num}
                  </text>
                </g>
              )
            })}
            {/* Center circle */}
            <circle cx="100" cy="100" r="20" fill="#fbbf24" stroke="white" strokeWidth="2" />
          </svg>

          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-400" />
          </div>
        </div>
      </div>

      {/* Result */}
      {result && !spinning && (
        <div className="text-center mb-6 p-4 rounded-xl border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="text-2xl font-bold">
            Result: <span className={`${result.color === 'red' ? 'text-red-500' : result.color === 'black' ? 'text-gray-900 dark:text-white' : 'text-green-500'}`}>
              {result.number} ({result.color.toUpperCase()})
            </span>
          </div>
          <div className="text-lg mt-2">Payout: {result.payout}</div>
        </div>
      )}

      {/* Betting Form */}
      <form onSubmit={handleSpin} className="space-y-6 max-w-2xl mx-auto">
        {/* Bet Amount */}
        <div>
          <label className="block mb-2 font-medium">Bet Amount:</label>
          <input
            type="number"
            min="5"
            value={betAmount}
            onChange={(e) => setBetAmount(+e.target.value)}
            className="w-full border rounded-xl px-4 py-2 bg-white dark:bg-gray-800"
            disabled={spinning}
          />
        </div>

        {/* Bet Type */}
        <div>
          <label className="block mb-2 font-medium">Bet Type:</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => { setBetType('zero'); setBetValue('0') }}
              className={`px-4 py-2 rounded-xl border-2 ${betType === 'zero' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300'}`}
              disabled={spinning}
            >
              Zero (16x)
            </button>
            <button
              type="button"
              onClick={() => { setBetType('color'); setBetValue('red') }}
              className={`px-4 py-2 rounded-xl border-2 ${betType === 'color' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300'}`}
              disabled={spinning}
            >
              Color (2x)
            </button>
            <button
              type="button"
              onClick={() => { setBetType('range'); setBetValue('1-9') }}
              className={`px-4 py-2 rounded-xl border-2 ${betType === 'range' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300'}`}
              disabled={spinning}
            >
              Range (4x)
            </button>
            <button
              type="button"
              onClick={() => { setBetType('number'); setBetValue('7') }}
              className={`px-4 py-2 rounded-xl border-2 ${betType === 'number' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300'}`}
              disabled={spinning}
            >
              Number (36x)
            </button>
          </div>
        </div>

        {/* Bet Value Selection */}
        <div>
          <label className="block mb-2 font-medium">Select Your Bet:</label>
          
          {betType === 'color' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBetValue('red')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 ${betValue === 'red' ? 'border-red-500 bg-red-500 text-white' : 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600'}`}
                disabled={spinning}
              >
                RED
              </button>
              <button
                type="button"
                onClick={() => setBetValue('black')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 ${betValue === 'black' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-400 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'}`}
                disabled={spinning}
              >
                BLACK
              </button>
            </div>
          )}

          {betType === 'range' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {RANGES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setBetValue(r)}
                  className={`px-4 py-3 rounded-xl border-2 ${betValue === r ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}
                  disabled={spinning}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {betType === 'number' && (
            <div>
              <input
                type="number"
                min="0"
                max="36"
                value={betValue}
                onChange={(e) => setBetValue(e.target.value)}
                className="w-full border rounded-xl px-4 py-2 bg-white dark:bg-gray-800"
                placeholder="Enter number (0-36)"
                disabled={spinning}
              />
              <div className="grid grid-cols-6 gap-1 mt-2">
                {[...Array(37)].map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBetValue(String(i))}
                    className={`p-2 rounded border text-sm ${
                      betValue === String(i) 
                        ? 'border-purple-500 bg-purple-500 text-white' 
                        : getColor(i) === 'red' 
                          ? 'bg-red-100 dark:bg-red-900/20 border-red-300' 
                          : getColor(i) === 'black'
                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-400'
                            : 'bg-green-100 dark:bg-green-900/20 border-green-300'
                    }`}
                    disabled={spinning}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}

          {betType === 'zero' && (
            <div className="text-center p-4 rounded-xl bg-green-100 dark:bg-green-900/20 border-2 border-green-500">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">0 (GREEN)</div>
              <div className="text-sm opacity-70 mt-1">16x multiplier</div>
            </div>
          )}
        </div>

        {/* Spin Button */}
        <button
          type="submit"
          className="w-full px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          disabled={spinning}
        >
          {spinning ? 'Spinning...' : 'SPIN'}
        </button>
      </form>
    </div>
  )
}

export default RequireAuth(RoulettePage)