'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../../context/UserContext'
import useApi from '../../hooks/useApi'
import Loading from '../../components/Loading'

const TYPE_LABELS = {
  all: 'All',
  deposit: 'Deposits',
  withdraw: 'Withdrawals',
  transfer_sent: 'Transfer Sent',
  transfer_received: 'Receipt',
}

export default function NotificationsPage() {
  const { user } = useUser()
  const { get, patch } = useApi()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter]   = useState('all')
  const [page, setPage]       = useState(1)
  const pageSize = 10

  // chỉ phụ thuộc vào user
  useEffect(() => {
    if (!user) return
    setLoading(true)
    get(`/notification?limit=100`)
      .then(res => setNotifications(res.notifications || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }, [user])

  const markAsRead = async id => {
    await patch(`/notification/${id}/read`)
    setNotifications(ns => ns.map(n => n._id === id ? { ...n, read: true } : n))
  }

  const filtered = notifications.filter(n =>
    filter === 'all' ? true : n.type === filter
  )
  const totalPages = Math.ceil(filtered.length / pageSize)
  const start = (page - 1) * pageSize
  const pageItems = filtered.slice(start, start + pageSize)

  if (!user) return <p className="p-8">Please log in to view notifications.</p>
  if (loading) return <Loading text="Loading notifications…" />

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Notifications</h1>

      {/* Filter */}
      <div className="flex space-x-4">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setPage(1) }}
            className={`px-3 py-1 rounded ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <ul className="space-y-4">
        {pageItems.length === 0 ? (
          <li className="text-gray-500">No notifications</li>
        ) : (
          pageItems.map(n => (
            <li
              key={n._id}
              className={`p-4 border rounded ${
                n.read
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'bg-white dark:bg-gray-800 font-semibold'
              }`}
              onClick={() => markAsRead(n._id)}
            >
              <div className="text-sm text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
              <div>{n.message}</div>
            </li>
          ))
        )}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
