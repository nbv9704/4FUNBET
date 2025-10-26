// client/src/app/register/page.js
'use client'

import { useState } from 'react'
import useApi from '../../hooks/useApi'
import Loading from '../../components/Loading' // Import Loading
import { toast } from 'react-hot-toast' // Thêm toast

export default function RegisterPage() {
  const { post } = useApi()
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false) // Thêm loading cho submit

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await post('/auth/register', { username, email, password })
      toast.success('Đã đăng ký thành công, hãy quay về đăng nhập để tiếp tục.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading text="Đang đăng ký…" />

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Register</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <div>
          <label className="block mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Register'}
        </button>
      </form>
    </div>
  )
}