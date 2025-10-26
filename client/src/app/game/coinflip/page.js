// client/src/app/game/coinflip/page.js
'use client'

import { useState } from 'react'
import useApi from '../../../hooks/useApi'
import { useUser } from '../../../context/UserContext'
import { toast } from 'react-hot-toast'

export default function CoinflipPage() {
  const [betAmount, setBetAmount] = useState(1)
  const [side, setSide] = useState('heads')
  const [result, setResult] = useState(null)
  const [isFlipping, setIsFlipping] = useState(false)

  const { post } = useApi()
  const { updateBalance } = useUser()

  const handleFlip = async (e) => {
    e.preventDefault()
    if (betAmount <= 0) {
      toast.error('Bet must be > 0')
      return
    }
    setIsFlipping(true)
    setResult(null)

    try {
      // Không gửi clientSeed — server vẫn chạy fair RNG với seed/nonce của nó
      const data = await post('/game/coinflip', { betAmount, side })

      setTimeout(() => {
        setResult({
          result: data.result,
          win: data.win,
          payout: data.payout,   // ✅ tin server
          balance: data.balance,
        })
        updateBalance(data.balance)
        setIsFlipping(false)

        if (data.win) {
          toast.success(`🎉 You win! The coin showed ${data.result}`)
        } else {
          toast.error(`😢 You lose. The coin showed ${data.result}`)
        }
      }, 1500)
    } catch (err) {
      toast.error(err.message || 'Flip failed')
      setIsFlipping(false)
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Coinflip</h1>

      {/* Bet form */}
      <form onSubmit={handleFlip} className="space-y-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="w-36 font-medium">Bet Amount:</label>
          <input
            type="number"
            min="1"
            value={betAmount}
            onChange={(e) => setBetAmount(+e.target.value)}
            className="border rounded px-2 py-1 w-32"
          />
        </div>

        <div className="flex items-center gap-4">
          <span className="w-36 font-medium">Choose Side:</span>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="side"
              value="heads"
              checked={side === 'heads'}
              onChange={() => setSide('heads')}
            />
            Heads
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="side"
              value="tails"
              checked={side === 'tails'}
              onChange={() => setSide('tails')}
            />
            Tails
          </label>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          disabled={isFlipping}
        >
          {isFlipping ? 'Flipping...' : 'Flip Coin'}
        </button>
      </form>

      {/* Coin Animation + Result */}
      <div className="mt-6 flex flex-col items-center">
        <div
          className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-xl font-bold
                      ${isFlipping ? 'animate-flip' : ''}`}
        >
          {isFlipping ? '' : result?.result?.toUpperCase() || '?'}
        </div>

        {result && !isFlipping && (
          <div className="mt-4 w-full text-center space-y-1">
            <p className="text-lg">{result.win ? '✅ You WON' : '❌ You LOST'}</p>
            <p>Payout: <b>{result.payout}</b></p>
            <p>Balance: <b>{result.balance}</b></p>
          </div>
        )}
      </div>
    </div>
  )
}
