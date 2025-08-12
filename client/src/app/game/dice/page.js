'use client'

import { useState } from 'react'
import useApi from '../../../hooks/useApi'
import { useUser } from '../../../context/UserContext'
import Loading from '../../../components/Loading'
import { toast } from 'react-hot-toast'

const ALLOWED_SIDES = [4, 6, 8, 10, 12, 20]

export default function DicePage() {
  const [betAmount, setBetAmount] = useState(1)
  const [sides, setSides] = useState(6)
  const [guess, setGuess] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isRolling, setIsRolling] = useState(false)
  const { post } = useApi()
  const { updateBalance } = useUser()

  const handleRoll = async (e) => {
    e.preventDefault()
    setIsRolling(true)
    setResult(null)
    try {
      const data = await post('/game/dice', { betAmount, sides, guess })
      setTimeout(() => {
        setResult({
          result: data.result,
          win: data.win,
          payout: data.payout,
          balance: data.balance,
        })
        updateBalance(data.balance)
        setIsRolling(false)

        if (data.win) {
          toast.success(`🎉 You win! Rolled ${data.result} on a d${data.sides}`)
        } else {
          toast.error(`😢 You lose. Rolled ${data.result} on a d${data.sides}`)
        }
      }, 1500)
    } catch (err) {
      toast.error(err.message)
      setIsRolling(false)
    }
  }

  if (loading) return <Loading text="Rolling the dice..." />

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dice Game</h1>

      {/* Bet form */}
      <form onSubmit={handleRoll} className="space-y-4 mb-6">
        <div>
          <label className="mr-2 font-medium">Bet Amount:</label>
          <input
            type="number"
            min="1"
            value={betAmount}
            onChange={(e) => setBetAmount(+e.target.value)}
            className="border rounded px-2 py-1 w-24"
          />
        </div>

        <div>
          <label className="mr-2 font-medium">Dice Type:</label>
          <select
            value={sides}
            onChange={(e) => {
              const selectedSides = +e.target.value
              setSides(selectedSides)
              if (guess > selectedSides) setGuess(1) // reset guess nếu vượt quá mặt xúc xắc
            }}
            className="border rounded px-2 py-1"
          >
            {ALLOWED_SIDES.map((s) => (
              <option key={s} value={s}>
                d{s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mr-2 font-medium">Your Guess:</label>
          <input
            type="number"
            min="1"
            max={sides}
            value={guess}
            onChange={(e) => setGuess(+e.target.value)}
            className="border rounded px-2 py-1 w-24"
          />
          <span className="ml-2 text-sm text-gray-500">(1 - {sides})</span>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={isRolling}
        >
          {isRolling ? 'Rolling...' : 'Roll Dice'}
        </button>
      </form>

      {/* Dice Animation & Result */}
      <div className="mt-6 flex flex-col items-center">
        <div
          className={`w-24 h-24 bg-gray-800 text-white rounded-lg border-4 flex items-center justify-center text-3xl font-bold
                      ${isRolling ? 'animate-dice-roll-3d' : ''}`}
          style={{ perspective: '800px' }}
        >
          {isRolling ? '' : result?.result || '?'}
        </div>
        {result && !isRolling && (
          <div className="mt-4 text-center space-y-2">
            <p className="text-lg">Payout: {result.payout}</p>
            <p className="font-semibold">Balance: {result.balance}</p>
          </div>
        )}
      </div>
    </div>
  )
}
