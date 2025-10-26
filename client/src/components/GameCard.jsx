// client/src/components/GameCard.jsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useMemo } from 'react'
import { GAMES } from '@/data/games'

/**
 * Props:
 * - mode: string (required) - game id (e.g. "coinflip")
 * - fluid?: boolean — if true the card flexes to parent width
 */
export default function GameCard({ mode, fluid = false }) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => setMounted(true), [])

  const game = useMemo(() => GAMES.find(g => g.id === mode), [mode])
  const title = game?.name ?? mode
  const isComingSoon = game?.status === 'coming_soon'

  // Skeleton during SSR/CSR mismatch
  if (!mounted) {
    return (
      <div
        className={`${fluid ? 'w-full' : 'w-56'} rounded-2xl border-2 bg-white dark:bg-gray-900 animate-pulse`}
        style={{ height: 256 }}
        aria-label="Loading game card"
      />
    )
  }

  const isDark = theme === 'dark'
  const borderClr = isDark ? 'border-gray-700' : 'border-gray-900'
  const textClr = isDark ? 'text-white' : 'text-black'
  const sectionBorder = isDark ? 'border-gray-700' : 'border-gray-300'
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white'
  const src = `/cards/${mode}.png`

  const cardW = fluid ? 'w-full' : 'w-56'
  const imageH = 'h-40'
  const labelH = 'h-10 md:h-16'
  const labelText = 'line-clamp-1 leading-none'

  return (
    <div
      className={[
        cardW,
        'rounded-2xl shadow-md hover:shadow-xl transition-all duration-300',
        'overflow-hidden border-2',
        cardBg,
        borderClr,
        isComingSoon ? 'opacity-90' : '',
      ].join(' ')}
      aria-label={`${title} card`}
    >
      <div className={`${imageH} relative`}>
        {/* Loading overlay */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse bg-black/10 dark:bg-white/10" />
        )}

        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-sm">
            No image
          </div>
        ) : (
          <img
            src={src}
            alt={`${title} preview`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-t-2xl"
            draggable={false}
          />
        )}

        {/* Coming Soon badge */}
        {isComingSoon && (
          <div className="absolute top-2 right-2">
            <span className="rounded-full px-2 py-1 text-[11px] font-semibold bg-yellow-400 text-black shadow">
              Coming Soon
            </span>
          </div>
        )}
      </div>

      <div className={`border-t-2 ${sectionBorder}`}>
        <div
          className={[
            labelH,
            'flex items-center justify-center font-semibold capitalize transition-colors duration-300',
            textClr,
            'text-lg px-3 text-center',
            labelText,
          ].join(' ')}
        >
          {title}
        </div>
      </div>
    </div>
  )
}