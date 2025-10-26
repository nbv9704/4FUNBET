// client/src/components/Navbar.jsx
'use client'

import Link from 'next/link'
import { useUser } from '../context/UserContext'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Sun, Moon, Menu, X } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useTheme } from 'next-themes'

export default function Navbar() {
  const { user, balance, bank, logout } = useUser()

  // ===== THEME (next-themes) =====
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

  // ===== HAMBURGER =====
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const panelRef = useRef(null)

  const toggleHamburger = useCallback(() => setHamburgerOpen((p) => !p), [])
  const closeHamburger = useCallback(() => setHamburgerOpen(false), [])

  // Lock scroll when panel open
  useEffect(() => {
    if (!hamburgerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [hamburgerOpen])

  // Focus first element in panel when opened
  useEffect(() => {
    if (!hamburgerOpen) return
    const t = setTimeout(() => {
      const focusables = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusables?.[0]?.focus()
    }, 0)
    return () => clearTimeout(t)
  }, [hamburgerOpen])

  // Trap focus + ESC to close
  useEffect(() => {
    if (!hamburgerOpen) return

    const onKeyDown = (e) => {
      if (!hamburgerOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        closeHamburger()
      } else if (e.key === 'Tab') {
        const list = panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!list || list.length === 0) return
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [hamburgerOpen, closeHamburger])

  const isAdmin = user?.role === 'admin' || user?.role === 'jadmin'

  const glowWhite = 'transition-all duration-200'
  const glowRed = 'transition-all duration-200 text-red-500 hover:text-red-400'

  // Format numbers safely
  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString(undefined) : n)

  // ✅ FIX: Better theme handling to prevent flicker
  const isDark = mounted ? (theme ?? resolvedTheme) === 'dark' : false

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

        {/* ✅ FIX: Stable placeholder prevents layout shift */}
        <div className="w-10 h-10 flex items-center justify-center">
          {mounted ? (
            <button
              onClick={toggleTheme}
              className="p-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle Dark Mode"
              type="button"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-800" />
              )}
            </button>
          ) : (
            <div className="p-2 w-9 h-9 rounded bg-gray-200 dark:bg-gray-700" />
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            {/* Notification Bell */}
            <NotificationBell />

            {/* Wallet */}
            <Link href="/wallet" className="group flex flex-col items-end">
              <span 
                className="text-sm group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                suppressHydrationWarning
              >
                Wallet: {fmt(balance)}
              </span>
              <span 
                className="text-xs text-gray-400 group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                suppressHydrationWarning
              >
                Bank: {fmt(bank)}
              </span>
            </Link>

            {/* Hamburger */}
            <button
              onClick={toggleHamburger}
              className="group p-2"
              aria-haspopup="dialog"
              aria-expanded={hamburgerOpen}
              aria-controls="nav-hamburger-panel"
              type="button"
            >
              {hamburgerOpen ? (
                <X className="w-6 h-6 group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              ) : (
                <Menu className="w-6 h-6 group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              )}
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              Login
            </Link>
            <Link href="/register" className="hover:underline">
              Register
            </Link>
          </>
        )}
      </div>

      {/* Overlay */}
      {user && hamburgerOpen && (
        <button
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeHamburger}
          aria-label="Close menu overlay"
          type="button"
        />
      )}

      {/* Hamburger Menu Panel */}
      {user && (
        <aside
          id="nav-hamburger-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="User menu"
          className={`fixed top-0 right-0 h-full w-64 bg-gray-900 text-white z-50 shadow-lg p-6 outline-none 
            ${hamburgerOpen ? 'animate-slide-in' : 'pointer-events-none animate-slide-out'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <img
                src={user.avatar || '/default-avatar.png'}
                alt="Avatar"
                className="w-10 h-10 rounded-full border border-gray-700 object-cover"
              />
              <span className="font-semibold">{user.username}</span>
            </div>
            <button onClick={closeHamburger} aria-label="Close menu" type="button">
              <X className="w-5 h-5 text-gray-400 hover:text-white transition" />
            </button>
          </div>

          <hr className="border-gray-700 mb-4" />

          {/* Profile */}
          <Link href="/profile" className="group flex items-center space-x-2 py-2" onClick={closeHamburger}>
            <img
              src="/symbols/profile.png"
              alt=""
              className="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
            />
            <span className="group-hover:text-white">Profile</span>
          </Link>

          {/* History */}
          <Link href="/history" className="group flex items-center space-x-2 py-2" onClick={closeHamburger}>
            <img
              src="/symbols/history.png"
              alt=""
              className="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
            />
            <span className="group-hover:text-white">History</span>
          </Link>

          <hr className="border-gray-700 my-2" />

          {/* Settings */}
          <Link href="/settings" className="group flex items-center space-x-2 py-2" onClick={closeHamburger}>
            <img
              src="/symbols/settings.png"
              alt=""
              className="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
            />
            <span className="group-hover:text-white">Settings</span>
          </Link>

          {/* Admin Health (only admin/jadmin) */}
          {isAdmin && (
            <>
              <hr className="border-gray-700 my-2" />
              <Link
                href="/admin/pvp/health"
                className="group flex items-center space-x-2 py-2"
                onClick={closeHamburger}
              >
                <span className="w-5 h-5 inline-flex items-center justify-center rounded bg-gray-800 text-xs">
                  H
                </span>
                <span className="group-hover:text-white">Admin Health</span>
              </Link>
            </>
          )}

          <hr className="border-gray-700 my-2" />

          {/* Logout */}
          <button
            onClick={() => {
              logout()
              closeHamburger()
            }}
            className="group flex items-center space-x-2 py-2 w-full text-left"
            type="button"
          >
            <img
              src="/symbols/logout.png"
              alt=""
              className="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]"
            />
            <span className={glowRed}>Sign out</span>
          </button>
        </aside>
      )}
    </nav>
  )
}