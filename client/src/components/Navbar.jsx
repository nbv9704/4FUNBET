// client/src/components/Navbar.jsx
'use client'

import Link from 'next/link'
import { useUser } from '../context/UserContext'
import { useState, useEffect } from 'react'
import { Sun, Moon, Menu, X } from 'lucide-react'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, balance, bank, logout } = useUser()
  const [theme, setTheme] = useState('light')
  const [hamburgerOpen, setHamburgerOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  const toggleHamburger = () => setHamburgerOpen(prev => !prev)

  const glowWhite = 'transition-all duration-200'
  const glowRed   = 'transition-all duration-200 text-red-500 hover:text-red-400'

  return (
    <nav className="flex items-center p-4 bg-gray-800 text-white justify-between relative">
      {/* Left side */}
      <div className="flex items-center space-x-6">
        <Link href="/" className={`group flex items-center text-lg font-bold ${glowWhite}`}>
          <span className="group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
            4FUNBET
          </span>
        </Link>
        <Link href="/game" className="group flex items-center">
          <span className="group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
            Game
          </span>
        </Link>
        <Link href="/rewards" className="group flex items-center">
          <span className="group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
            Rewards
          </span>
        </Link>
        {/* Dark Mode Toggle moved here */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label="Toggle Dark Mode"
        >
          {theme === 'dark'
            ? <Sun className="w-5 h-5 text-yellow-400" />
            : <Moon className="w-5 h-5 text-gray-800" />
          }
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            {/* Notification Bell */}
            <NotificationBell />

            {/* Wallet */}
            <Link href="/wallet" className="group flex flex-col items-end">
              <span className="text-sm group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
                Wallet: {balance}
              </span>
              <span className="text-xs text-gray-400 group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
                Bank: {bank}
              </span>
            </Link>

            {/* Hamburger */}
            <button onClick={toggleHamburger} className="group p-2">
              {hamburgerOpen
                ? <X className="w-6 h-6 group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                : <Menu className="w-6 h-6 group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              }
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">Login</Link>
            <Link href="/register" className="hover:underline">Register</Link>
          </>
        )}
      </div>

      {/* Overlay */}
      {user && hamburgerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleHamburger}
        />
      )}

      {/* Hamburger Menu Panel */}
      {user && (
        <aside
          className={`fixed top-0 right-0 h-full w-64 bg-gray-900 text-white z-50 shadow-lg p-6 
            ${hamburgerOpen ? 'animate-slide-in' : 'animate-slide-out'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <img
                src={user.avatar || '/default-avatar.png'}
                alt="Avatar"
                className="w-10 h-10 rounded-full border border-gray-700"
              />
              <span className="font-semibold">{user.username}</span>
            </div>
            <button onClick={toggleHamburger}>
              <X className="w-5 h-5 text-gray-400 hover:text-white transition" />
            </button>
          </div>

          <hr className="border-gray-700 mb-4" />

          {/* Profile */}
          <Link href="/profile" className="group flex items-center space-x-2 py-2" onClick={toggleHamburger}>
            <img src="/symbols/profile.png" alt="Profile" className="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            <span className="group-hover:text-white">Profile</span>
          </Link>

          {/* History */}
          <Link href="/history" className="group flex items-center space-x-2 py-2" onClick={toggleHamburger}>
            <img src="/symbols/history.png" alt="History" className="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            <span className="group-hover:text-white">History</span>
          </Link>

          <hr className="border-gray-700 my-2" />

          {/* Settings */}
          <Link href="/settings" className="group flex items-center space-x-2 py-2" onClick={toggleHamburger}>
            <img src="/symbols/settings.png" alt="Settings" className="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            <span className="group-hover:text-white">Settings</span>
          </Link>

          <hr className="border-gray-700 my-2" />

          {/* Logout */}
          <button
            onClick={() => { logout(); toggleHamburger() }}
            className="group flex items-center space-x-2 py-2 w-full text-left"
          >
            <img src="/symbols/logout.png" alt="Logout" className="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]" />
            <span className="text-red-500 group-hover:text-red-400">Sign out</span>
          </button>
        </aside>
      )}
    </nav>
  )
}
