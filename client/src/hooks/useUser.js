// client/src/hooks/useUser.js

'use client'

import { useState, useEffect } from 'react'
import useApi from './useApi'
import { usePathname, useRouter } from 'next/navigation'

export function useUser() {
  const [user, setUser]       = useState(null)
  const [balance, setBalance] = useState(0)
  const { get }               = useApi()
  const router                = useRouter()
  const pathname              = usePathname()

  // mỗi khi mount hoặc chuyển trang, fetch lại /auth/me
  useEffect(() => {
    ;(async () => {
      try {
        const { username, email, balance } = await get('/auth/me')
        setUser({ username, email })
        setBalance(balance)
      } catch {
        setUser(null)
        setBalance(0)
      }
    })()
  }, [pathname, get])

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      setUser(null)
      setBalance(0)
      router.push('/login')
    }
  }

  // cho phép cập nhật balance từ bên ngoài
  const updateBalance = (newBalance) => {
    setBalance(newBalance)
  }

  return { user, balance, updateBalance, logout }
}
