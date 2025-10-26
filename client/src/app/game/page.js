// client/src/app/game/page.js
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { GAMES } from '@/data/games'
import GameCard from '@/components/GameCard'
import GameFilterBar from '@/components/GameFilterBar'
import GameDetailModal from '@/components/GameDetailModal'

export default function GameHubPage() {
  const [filter, setFilter] = useState({
    type: 'all',         // 'all' | 'solo' | 'battle'
    sort: 'name_asc',    // 'name_asc'|'name_desc'|'stake_asc'|'stake_desc'
    q: '',
  })
  const [activeGame, setActiveGame] = useState(null)

  const filtered = useMemo(() => {
    let list = [...GAMES]

    // type filter
    if (filter.type !== 'all') {
      list = list.filter(g => g.supports?.includes(filter.type))
    }

    // search
    if (filter.q?.trim()) {
      const s = filter.q.trim().toLowerCase()
      list = list.filter(g =>
        g.name.toLowerCase().includes(s) || g.id.toLowerCase().includes(s)
      )
    }

    // sort
    switch (filter.sort) {
      case 'name_desc':
        list.sort((a,b) => b.name.localeCompare(a.name)); break
      case 'stake_asc':
        list.sort((a,b) => (a.minBet ?? 0) - (b.minBet ?? 0)); break
      case 'stake_desc':
        list.sort((a,b) => (b.minBet ?? 0) - (a.minBet ?? 0)); break
      default:
        list.sort((a,b) => a.name.localeCompare(b.name)); break
    }

    // Keep “with thumbnails first” feel (coinflip/dice/blackjackdice)
    const HAS_THUMB = new Set(['coinflip','dice','blackjackdice'])
    list.sort((a,b) => (HAS_THUMB.has(b.id) - HAS_THUMB.has(a.id)))

    return list
  }, [filter])

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">Game</h1>
        <div className="flex gap-3">
          <Link href="/game/solo" className="px-4 py-2 rounded-2xl border shadow">Solo</Link>
          <Link href="/game/battle" className="px-4 py-2 rounded-2xl border shadow">Battle</Link>
        </div>
      </div>

      <p className="opacity-70 mb-4">
        Browse all games below. Use filters to find what you want — click a card to preview.
      </p>

      <GameFilterBar onChange={setFilter} initial={filter} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 items-stretch">
        {filtered.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGame(g)}
            className="text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label={`Preview ${g.name}`}
          >
            <GameCard mode={g.id} fluid />
          </button>
        ))}
      </div>

      <GameDetailModal
        open={!!activeGame}
        onOpenChange={(v) => !v && setActiveGame(null)}
        game={activeGame}
        // preferredType={filter.type === 'battle' ? 'battle' : 'solo'}
        // (Giữ mặc định 'solo'; nếu muốn thay đổi đường đi khi đang lọc 'battle' thì mở dòng trên.)
      />
    </div>
  )
}
