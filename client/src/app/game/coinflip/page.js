'use client'

import { useState } from 'react'
import useApi from '../../../hooks/useApi'
import { useUser } from '../../../context/UserContext'
import Loading from '../../../components/Loading'
import { toast } from 'react-hot-toast'

export default function CoinflipPage() {
  const [betAmount, setBetAmount] = useState(1)
  const [side, setSide] = useState('heads')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false) // animation state
  const { post } = useApi()
  const { updateBalance } = useUser()

  const handleFlip = async (e) => {
    e.preventDefault()
    setIsFlipping(true)
    setResult(null) // reset kết quả cũ
    try {
      const data = await post('/game/coinflip', { betAmount, side })
      setTimeout(() => {
        setResult({
          result: data.result,
          win: data.win,
          payout: data.win ? betAmount : 0, // thêm payout
          balance: data.balance,
        })
        updateBalance(data.balance)
        setIsFlipping(false)

        if (data.win) {
          toast.success(`🎉 You win! The coin showed ${data.result}`)
        } else {
          toast.error(`😢 You lose. The coin showed ${data.result}`)
        }
      }, 1500) // delay cho animation
    } catch (err) {
      toast.error(err.message)
      setIsFlipping(false)
    }
  }

  if (loading) return <Loading text="Flipping the coin..." />

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Coinflip</h1>

      {/* Bet form */}
      <form onSubmit={handleFlip} className="space-y-4 mb-6">
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
          <label className="mr-4 font-medium">Choose Side:</label>
          <label className="mr-4">
            <input
              type="radio"
              name="side"
              value="heads"
              checked={side === 'heads'}
              onChange={() => setSide('heads')}
            />
            <span className="ml-1">Heads</span>
          </label>
          <label>
            <input
              type="radio"
              name="side"
              value="tails"
              checked={side === 'tails'}
              onChange={() => setSide('tails')}
            />
            <span className="ml-1">Tails</span>
          </label>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={isFlipping}
        >
          {isFlipping ? 'Flipping...' : 'Flip Coin'}
        </button>
      </form>

      {/* Coin Animation */}
      <div className="mt-6 flex flex-col items-center">
        <div
          className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-xl font-bold
                      ${isFlipping ? 'animate-flip' : ''}`}
        >
          {isFlipping ? '' : result?.result?.toUpperCase() || '?'}
        </div>
        {result && !isFlipping && (
          <div className="mt-4 text-center space-y-2">
            <p className="text-xl">Payout: {result.payout}</p>
            <p className="font-semibold">Balance: {result.balance}</p>
          </div>
        )}
      </div>
    </div>
  )
}
