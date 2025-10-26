// client/src/app/game/blackjackdice/page.js
'use client'

import { useEffect, useState } from 'react'
import useApi from '../../../hooks/useApi'
import { useUser } from '../../../context/UserContext'
import Loading from '../../../components/Loading'
import { toast } from 'react-hot-toast'

export default function BlackjackDicePage() {
  const [betAmount, setBetAmount] = useState(1)
  const [state, setState] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasPendingGame, setHasPendingGame] = useState(false)
  const { post } = useApi()
  const { updateBalance } = useUser()
  
  useEffect(() => {
    const checkGame = async () => {
      try {
        const data = await post('/game/blackjackdice/check')
        if (data.active) {
          setHasPendingGame(true)
          setState(data.state)
        }
      } catch (err) {
        console.error(err)
      }
    }
    checkGame()
  }, [])

  const handleStart = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await post('/game/blackjackdice/start', { betAmount })
      setState({
        playerDice: data.playerDice,
        playerSum: data.playerSum,
        dealerVisible: data.dealerVisible,
        dealerDice: null,
        dealerSum: null,
        outcome: null,
        payout: null,
        balance: data.balance,
      })
      updateBalance(data.balance)
      setIsActive(true)
      setHasPendingGame(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async () => {
    try {
      const data = await post('/game/blackjackdice/resume')
      setState({
        playerDice: data.playerDice,
        playerSum: data.playerSum,
        dealerVisible: data.dealerVisible,
        dealerDice: null,
        dealerSum: null,
        outcome: null,
        payout: null,
        balance: data.balance,
      })
      updateBalance(data.balance)
      setIsActive(true)
      setHasPendingGame(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleAbandon = async () => {
    try {
      await post('/game/blackjackdice/abandon')
      toast('Game abandoned')
      setHasPendingGame(false)
      setState(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleHit = async () => {
    setLoading(true)
    try {
      const data = await post('/game/blackjackdice/hit')
      if (data.outcome) {
        setState({
          ...state,
          playerDice: data.playerDice,
          playerSum: data.playerSum,
          dealerDice: data.dealerDice,
          dealerSum: data.dealerSum,
          outcome: data.outcome,
          payout: data.payout,
          balance: data.balance,
        })
        updateBalance(data.balance)
        setIsActive(false)
        if (data.outcome === 'win') toast.success(`🎉 You win! Payout: ${data.payout}`)
        else if (data.outcome === 'lose') toast.error('😢 You lose.')
        else if (data.outcome === 'tie') toast(`😐 It's a tie. Refund: ${data.payout}`, { icon: 'ℹ️' })
      } else {
        setState({
          ...state,
          playerDice: data.playerDice,
          playerSum: data.playerSum,
          dealerVisible: data.dealerVisible,
          balance: data.balance,
        })
        updateBalance(data.balance)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStand = async () => {
    setLoading(true)
    try {
      const data = await post('/game/blackjackdice/stand')
      setState({
        ...state,
        playerDice: data.playerDice,
        playerSum: data.playerSum,
        dealerDice: data.dealerDice,
        dealerSum: data.dealerSum,
        outcome: data.outcome,
        payout: data.payout,
        balance: data.balance,
      })
      updateBalance(data.balance)
      setIsActive(false)
      if (data.outcome === 'win') toast.success(`🎉 You win! Payout: ${data.payout}`)
      else if (data.outcome === 'lose') toast.error('😢 You lose.')
      else if (data.outcome === 'tie') toast(`😐 It's a tie. Refund: ${data.payout}`, { icon: 'ℹ️' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const dealerToShow = !isActive && state?.dealerDice
    ? state.dealerDice
    : state?.dealerVisible || []

  if (loading) return <Loading text="Đang tải Blackjack Dice…" />

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Blackjack Dice</h1>

      {!isActive && !hasPendingGame && (
        <form onSubmit={handleStart} className="space-y-4 mb-6">
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
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Start Game
          </button>
        </form>
      )}

      {!isActive && hasPendingGame && (
        <div className="flex space-x-4 mb-6">
          <button onClick={handleResume} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Continue Game
          </button>
          <button onClick={handleAbandon} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Abandon Game
          </button>
        </div>
      )}

      {state && (
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold">Your Dice (Sum: {state.playerSum})</h2>
            <div className="flex space-x-2 mt-2">
              {state.playerDice.map((d, i) => (
                <div key={i} className="w-12 h-12 flex items-center justify-center border rounded">
                  {d}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold">
              Dealer Dice
              {!isActive && state.dealerSum != null && ` (Sum: ${state.dealerSum})`}
            </h2>
            <div className="flex space-x-2 mt-2">
              {dealerToShow.map((d, i) => (
                <div
                  key={i}
                  className="w-12 h-12 flex items-center justify-center border rounded bg-gray-100 text-gray-900"
                >
                  {d === null ? '?' : d}
                </div>
              ))}
            </div>
          </div>

          {isActive && (
            <div className="flex space-x-4">
              <button onClick={handleHit} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Hit
              </button>
              <button onClick={handleStand} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                Stand
              </button>
            </div>
          )}

          <p className="mt-4">Balance: {state.balance}</p>
        </div>
      )}
    </div>
  )
}
