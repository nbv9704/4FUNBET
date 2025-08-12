'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useApi from '../../hooks/useApi'
import { useUser } from '../../context/UserContext'
import Loading from '../../components/Loading' // Import Loading
import { toast } from 'react-hot-toast' // Thêm toast

export default function LoginPage() {
  const router = useRouter()
  const { post } = useApi()
  const { fetchUser } = useUser()

  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword]               = useState('')
  const [loading, setLoading]                 = useState(false) // Thêm loading cho submit

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // 1) Gửi login, lưu token
      const { token } = await post('/auth/login', { usernameOrEmail, password })
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token)
      }

      // 2) Khởi động đếm ngược 3s với toast
      let counter = 3
      toast.success(`Đăng nhập thành công. Chuyển hướng sau ${counter}s…`)

      const intervalId = setInterval(() => {
        counter -= 1

        if (counter > 0) {
          toast.success(`Đăng nhập thành công. Chuyển hướng sau ${counter}s…`)
        } else {
          clearInterval(intervalId)
          // 3) Sau cùng: fetch lại user để Navbar cập nhật
          fetchUser()
          // 4) và mới điều hướng về Home
          router.push('/')
        }
      }, 1000)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading text="Đang đăng nhập…" />

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Login</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Username or Email</label>
          <input
            type="text"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
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
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
    </div>
  )
}