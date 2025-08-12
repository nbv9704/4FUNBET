'use client'

import { useState, useEffect } from 'react'
import useApi from '../../hooks/useApi'
import { useUser } from '../../context/UserContext'
import Loading from '../../components/Loading'

export default function HistoryPage() {
  const { user } = useUser()
  const { get } = useApi()

  const [history, setHistory] = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const limit = 10

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    get(`/user/${user.id}/history?page=${page}&limit=${limit}`)
      .then(res => {
        setHistory(res.history || [])
        setTotal(res.total || 0)
        setError('')
      })
      .catch(err => {
        setError(err.response?.data?.error || err.message)
        setHistory([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page])

  if (!user) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <span className="text-gray-900 dark:text-gray-100">
          Vui lòng đăng nhập để xem lịch sử chơi.
        </span>
      </div>
    )
  }

  if (loading) {
    return <Loading text="Đang tải lịch sử…" />
  }

  if (error) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <span className="text-red-500">{error}</span>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <span className="text-gray-900 dark:text-gray-100">
          Chưa có lịch sử chơi nào.
        </span>
      </div>
    )
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        Game History
      </h1>
      <table className="min-w-full shadow rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            <th className="px-4 py-2 text-gray-900 dark:text-gray-100">Game Played</th>
            <th className="px-4 py-2 text-gray-900 dark:text-gray-100">Bet Amount</th>
            <th className="px-4 py-2 text-gray-900 dark:text-gray-100">Status</th>
            <th className="px-4 py-2 text-gray-900 dark:text-gray-100">Payout</th>
            <th className="px-4 py-2 text-gray-900 dark:text-gray-100">When</th>
          </tr>
        </thead>
        <tbody>
          {history.map(item => (
            <tr key={item._id} className="border-t border-gray-200 dark:border-gray-600">
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.game}</td>
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.betAmount}</td>
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                {item.outcome === 'win' ? 'Won'
                  : item.outcome === 'lose' ? 'Lost'
                  : 'Tie'}
              </td>
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.payout}</td>
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                {new Date(item.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination */}
      <div className="mt-4 flex justify-center space-x-2">
        <button
          onClick={() => setPage(prev => Math.max(prev - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 rounded disabled:opacity-50
                     bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500
                     text-gray-900 dark:text-gray-100"
        >
          Prev
        </button>
        <span className="px-4 py-2 text-gray-900 dark:text-gray-100">
          Page {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
          disabled={page >= totalPages}
          className="px-4 py-2 rounded disabled:opacity-50
                     bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500
                     text-gray-900 dark:text-gray-100"
        >
          Next
        </button>
      </div>
    </div>
  )
}
