// client/src/context/UserContext.jsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import useApi from '../hooks/useApi'
import { useRouter } from 'next/navigation'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [balance, setBalance] = useState(0)
  const [bank, setBank]       = useState(0)
  const { get }               = useApi()
  const router                = useRouter()

  const fetchUser = async () => {
    try {
      const u = await get('/user/me')
      setUser({
        id: u._id,
        username: u.username,
        email: u.email,
        avatar: u.avatar || '',
        dateOfBirth: u.dateOfBirth || null
      })
      setBalance(u.balance)
      setBank(u.bank)
    } catch {
      setUser(null)
      setBalance(0)
      setBank(0)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      setUser(null)
      setBalance(0)
      setBank(0)
      router.push('/login')
    }
  }

  const updateBalance = (newBalance) => setBalance(newBalance)
  const updateBank    = (newBank)     => setBank(newBank)

  return (
    <UserContext.Provider value={{
      user, balance, bank,
      fetchUser, logout,
      updateBalance, updateBank
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
