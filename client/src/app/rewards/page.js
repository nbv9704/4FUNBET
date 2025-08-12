'use client'

import { useState, useEffect } from 'react'
import useApi from '../../hooks/useApi'
import { useUser } from '../../context/UserContext'
import Loading from '../../components/Loading'
import { toast } from 'react-hot-toast'

const COOLDOWN_MS = {
  hourly: 3600 * 1000,
  daily:  24   * 3600 * 1000,
  weekly: 7    * 24   * 3600 * 1000
}
const AMOUNTS = { hourly:10, daily:100, weekly:1000 }

function formatTime(seconds) {
  if (seconds <= 0) return '0s';
  const days    = Math.floor(seconds / 86400)
  const hours   = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs    = seconds % 60
  let result = ''
  if (days)    result += `${days}d`
  if (hours)   result += `${hours}h`
  if (minutes) result += `${minutes}m`
  if (secs || !result) result += `${secs}s`
  return result
}

export default function RewardsPage() {
  const { user, updateBalance } = useUser()
  const { get, post }          = useApi()   // chỉ lấy get và post

  const [status, setStatus]     = useState({ hourly:0, daily:0, weekly:0 })
  const [remaining, setRemaining] = useState({ hourly:0, daily:0, weekly:0 })
  const [loading, setLoading]   = useState(true)
  const [fetchError, setFetchError] = useState('')

  // 1️⃣ Fetch status chỉ khi user thay đổi
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    get('/rewards')
      .then(data => {
        setStatus({
          hourly:  data.hourly  ? new Date(data.hourly).getTime()  : 0,
          daily:   data.daily   ? new Date(data.daily).getTime()   : 0,
          weekly:  data.weekly  ? new Date(data.weekly).getTime()  : 0
        })
        setFetchError('')
      })
      .catch(err => {
        console.error('Fetch rewards error:', err)
        setFetchError(err.message || 'Failed to fetch')
        // không toast ở đây để tránh spam toast liên tục
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // 2️⃣ Countdown
  useEffect(() => {
    const update = () => {
      const now = Date.now()
      setRemaining({
        hourly: Math.max(0, Math.ceil((COOLDOWN_MS.hourly - (now - status.hourly)) / 1000)),
        daily:  Math.max(0, Math.ceil((COOLDOWN_MS.daily  - (now - status.daily))  / 1000)),
        weekly: Math.max(0, Math.ceil((COOLDOWN_MS.weekly - (now - status.weekly)) / 1000))
      })
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [status])

  // 3️⃣ Collect reward
  const handleCollect = (type) => {
    post(`/rewards/${type}`)
      .then(data => {
        const now = Date.now()
        setStatus(prev => ({ ...prev, [type]: now }))
        updateBalance(data.balance)
        toast.success(`+${AMOUNTS[type]} đã được nhận!`)
      })
      .catch(err => {
        const d = err.response?.data
        if (d?.nextAvailable) {
          const next = new Date(d.nextAvailable).getTime()
          const lastCollect = next - COOLDOWN_MS[type]
          setStatus(prev => ({ ...prev, [type]: lastCollect }))
        }
        toast.error(d?.error || err.message)
      })
  }

  if (!user) return <Loading text="Vui lòng đăng nhập để xem Rewards." />
  if (loading) return <Loading text="Đang tải Rewards…" />

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Rewards</h1>
      {fetchError && (
        <p className="mb-4 text-center text-red-600">
          {fetchError}. Sử dụng trạng thái tạm thời.
        </p>
      )}
      <div className="grid grid-cols-3 gap-4">
        {['hourly','daily','weekly'].map(type => {
          const ready = remaining[type] === 0 && !loading && !fetchError
          return (
            <div key={type} className="p-4 border rounded shadow text-center">
              <h2 className="capitalize text-xl">{type}</h2>
              <p className="mt-2">Amount: {AMOUNTS[type]}</p>
              <button
                onClick={() => handleCollect(type)}
                disabled={!ready}
                className={`mt-4 px-4 py-2 rounded ${
                  ready
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                {ready ? 'Collect' : `Wait ${formatTime(remaining[type])}`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
