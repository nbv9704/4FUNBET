// client/src/components/GameDetailModal.jsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Props:
 * - open: boolean
 * - onOpenChange: (boolean) => void
 * - game: { id, name, description, minBet, supports, status }
 * - preferredType?: 'solo'|'battle'  // để quyết định Play đi tới đâu nếu support cả hai
 */
export default function GameDetailModal({ open, onOpenChange, game, preferredType = 'solo' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onOpenChange?.(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  if (!open || !game) return null

  const playable =
    game.status === 'live' &&
    (game.supports?.includes(preferredType) || game.supports?.length > 0)

  const href = preferredType === 'battle'
    ? `/game/battle/${game.id}`
    : `/game/${game.id}`

  return (
    <div className="fixed inset-0 z-[60]">
      {/* overlay */}
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      {/* dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white dark:bg-gray-900 shadow-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{game.name}</h2>
          {game.status === 'coming_soon' && (
            <span className="text-[12px] px-2 py-1 rounded-full bg-yellow-400 text-black font-semibold">
              Coming Soon
            </span>
          )}
        </div>

        {/* body */}
        <div className="p-4 space-y-3">
          <div className="rounded-xl overflow-hidden border">
            <img
              src={`/cards/${game.id}.png`}
              alt={`${game.name} cover`}
              className="w-full h-48 object-cover"
              draggable={false}
            />
          </div>

          {game.description && (
            <p className="text-sm opacity-80">{game.description}</p>
          )}

          <div className="text-sm">
            <div><b>Min stake:</b> {game.minBet}</div>
            <div><b>Supports:</b> {game.supports?.join(', ')}</div>
          </div>
        </div>

        {/* footer */}
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button
            className="px-4 py-2 rounded-xl border"
            onClick={() => onOpenChange?.(false)}
          >
            Close
          </button>

          {playable ? (
            <Link
              href={href}
              className="px-4 py-2 rounded-xl border shadow font-semibold"
              onClick={() => onOpenChange?.(false)}
            >
              Play
            </Link>
          ) : (
            <button
              className="px-4 py-2 rounded-xl border shadow font-semibold opacity-60 cursor-not-allowed"
              disabled
              title="This mode is not available yet"
            >
              Not Available
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
