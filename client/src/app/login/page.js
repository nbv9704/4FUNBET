// client/src/app/login/page.js
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useApi from '../../hooks/useApi'
import { useUser } from '../../context/UserContext'
import Loading from '../../components/Loading'
import { toast } from 'react-hot-toast'

const REDIRECT_FLAG = 'auth:redirected'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams?.get('next') || '/'
  const { post } = useApi()
  const { fetchUser, user } = useUser()

  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')

  const [authBusy, setAuthBusy] = useState(false)
  const [countingDown, setCountingDown] = useState(false)

  const redirectingRef = useRef(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    try { sessionStorage.removeItem(REDIRECT_FLAG) } catch {}
  }, [])

  useEffect(() => {
    if (authBusy || countingDown) return

    let token = null
    try { token = localStorage.getItem('token') } catch {}
    if (!token) return

    if (user && !redirectingRef.current) {
      redirectingRef.current = true
      router.replace(nextPath)
      return
    }

    if (!user && !redirectingRef.current) {
      (async () => {
        try {
          await fetchUser()
          if (!authBusy && !countingDown && !redirectingRef.current && localStorage.getItem('token')) {
            redirectingRef.current = true
            router.replace(nextPath)
          }
        } catch {}
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, nextPath, authBusy, countingDown])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (authBusy || countingDown) return

    setAuthBusy(true)
    try {
      const { token } = await post('/auth/login', { usernameOrEmail, password })
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token)
      }

      setAuthBusy(false)
      setCountingDown(true)

      let counter = 3
      const toastId = 'login-redirect'
      toast.success(`Đăng nhập thành công. Chuyển hướng sau ${counter}s…`, { id: toastId })

      intervalRef.current = setInterval(async () => {
        counter -= 1
        if (counter > 0) {
          toast.success(`Đăng nhập thành công. Chuyển hướng sau ${counter}s…`, { id: toastId })
        } else {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          setCountingDown(false)

          // 🔑 NẠP USER TRƯỚC KHI CHUYỂN TRANG → Navbar cập nhật ngay, không cần refresh
          try { await fetchUser() } catch {}

          redirectingRef.current = true
          router.replace(nextPath || '/')
        }
      }, 1000)
    } catch (err) {
      toast.error(err?.message || 'Login failed')
      setAuthBusy(false)
      setCountingDown(false)
    }
  }

  if (authBusy) return <Loading text="Đang đăng nhập…" />

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
            disabled={countingDown}
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
            disabled={countingDown}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          disabled={authBusy || countingDown}
        >
          {authBusy ? 'Loading...' : (countingDown ? 'Đang đếm ngược…' : 'Login')}
        </button>
      </form>
    </div>
  )
}
