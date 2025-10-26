// client/src/components/GameModeCarousel.jsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import GameCard from './GameCard'
import { useTheme } from 'next-themes'
import { useUser } from '../context/UserContext'
import { toast } from 'react-hot-toast'

// Mặc định vẫn là 3 game hiện có; có thể truyền prop `modes` để custom.
const DEFAULT_MODES = ['coinflip', 'blackjackdice', 'dice']

export default function GameModeCarousel({
  modes = DEFAULT_MODES,
  hrefBase = '/game', // ➕ cho phép Battle đổi base path sang /game/battle
}) {
  const { theme, resolvedTheme } = useTheme()
  const { user } = useUser()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // ---- measure container width (responsive) ----
  const wrapperRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(560)

  useEffect(() => {
    if (!wrapperRef.current) return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect?.width) setContainerWidth(rect.width)
    })
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // ---- layout constants ----
  const cardWidth = 240
  const gap = 16
  const visible = Math.max(1, Math.floor(containerWidth / (cardWidth + gap)))
  const maxStart = Math.max(0, modes.length - visible)

  const [start, setStart] = useState(0)
  useEffect(() => {
    // nếu resize làm visible tăng, đảm bảo start vẫn hợp lệ
    setStart((s) => Math.min(s, maxStart))
  }, [maxStart])

  const prev = useCallback(() => setStart((s) => Math.max(0, s - 1)), [])
  const next = useCallback(() => setStart((s) => Math.min(maxStart, s + 1)), [maxStart])

  // ---- a11y / keyboard ----
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      next()
    }
  }

  // ---- swipe (mobile) ----
  const touchRef = useRef({ x: 0, y: 0 })
  const onTouchStart = (e) => {
    const t = e.touches?.[0]
    if (!t) return
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    const t = e.changedTouches?.[0]
    if (!t) return
    const dx = t.clientX - touchRef.current.x
    // threshold 40px
    if (Math.abs(dx) > 40) {
      if (dx < 0) next()
      else prev()
    }
  }

  // ---- guard SSR theme mismatch ----
  const isDark = mounted ? (theme ?? resolvedTheme) === 'dark' : false

  // ---- login gate ----
  const handleClick = (e) => {
    if (!user) {
      e.preventDefault()
      toast.error('Bạn cần phải đăng nhập để bắt đầu chơi.')
    }
  }

  const btnBase =
    'absolute top-1/2 -translate-y-1/2 p-2 rounded-full border shadow disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-offset-2'
  const buttonStyle = isDark
    ? `${btnBase} bg-black border-gray-700 text-white`
    : `${btnBase} bg-white border-black text-black`

  return (
    <div className="relative mx-auto w-full max-w-[720px]">
      {/* Prev */}
      <button
        type="button"
        onClick={prev}
        disabled={start === 0}
        className={`${buttonStyle} left-0`}
        aria-label="Previous games"
      >
        ‹
      </button>

      {/* Track container */}
      <div
        ref={wrapperRef}
        className="overflow-hidden mx-10"
        role="region"
        aria-label="Game carousel"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex space-x-4 transition-transform duration-300 will-change-transform"
          style={{
            transform: `translateX(-${start * (cardWidth + gap)}px)`,
            padding: '0 40px', // hé card 2 bên
            width: 'max-content',
          }}
        >
          {modes.map((mode) => (
            <Link
              key={mode}
              href={`${hrefBase}/${mode}`} // 🔁 dùng base path truyền vào
              onClick={handleClick}
              className="block flex-shrink-0"
              aria-label={`Open ${mode}`}
              style={{ width: cardWidth }}
            >
              <GameCard mode={mode} />
            </Link>
          ))}
        </div>
      </div>

      {/* Next */}
      <button
        type="button"
        onClick={next}
        disabled={start >= maxStart}
        className={`${buttonStyle} right-0`}
        aria-label="Next games"
      >
        ›
      </button>

      {/* Dots (optional small indicator) */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {Array.from({ length: maxStart + 1 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStart(i)}
            aria-label={`Go to position ${i + 1}`}
            className={`h-2 w-2 rounded-full ${
              i === start ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
