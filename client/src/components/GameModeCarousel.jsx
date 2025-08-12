// client/src/components/GameModeCarousel.jsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GameCard from './GameCard'
import { useTheme } from 'next-themes'
import { useUser } from '../context/UserContext'
import { toast } from 'react-hot-toast'

const modes = ['coinflip', 'blackjackdice', 'dice']

export default function GameModeCarousel() {
  const { theme } = useTheme()
  const { user } = useUser()
  const [start, setStart] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const cardWidth = 240
  const gap = 16
  const containerWidth = 560
  const visible = Math.floor(containerWidth / (cardWidth + gap))

  const prev = () => setStart(Math.max(0, start - 1))
  const next = () => setStart(Math.min(modes.length - visible, start + 1))

  if (!mounted) return null // Chờ client mount

  const buttonStyle = `
    absolute top-1/2 transform -translate-y-1/2 
    p-2 rounded-full border 
    ${theme === 'dark'
      ? 'bg-black border-gray-700 text-white'
      : 'bg-white border-black text-black'}
    shadow disabled:opacity-30
  `

  const handleClick = e => {
    if (!user) {
      e.preventDefault()
      toast.error('Bạn cần phải đăng nhập để bắt đầu chơi.')
    }
  }

  return (
    <div className="relative w-[560px] mx-auto">
      {/* Nút Prev */}
      <button onClick={prev} disabled={start === 0} className={`${buttonStyle} left-0`}>
        ‹
      </button>

      {/* Container có overflow-hidden nhưng thêm padding để hé card */}
      <div className="overflow-hidden mx-10" style={{ width: `${containerWidth}px` }}>
        <div
          className="flex space-x-4 transition-transform duration-300"
          style={{
            transform: `translateX(-${start * (cardWidth + gap)}px)`,
            padding: '0 40px' // Hé card 2 bên
          }}
        >
          {modes.map(mode => (
            <Link
              key={mode}
              href={`/game/${mode}`}
              onClick={handleClick}
              className="block flex-shrink-0"
            >
              <GameCard mode={mode} />
            </Link>
          ))}
        </div>
      </div>

      {/* Nút Next */}
      <button
        onClick={next}
        disabled={start >= modes.length - visible}
        className={`${buttonStyle} right-0`}
      >
        ›
      </button>
    </div>
  )
}
