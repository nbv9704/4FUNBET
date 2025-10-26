// client/src/components/GameFilterBar.jsx
'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * Props:
 * - onChange: (state) => void
 * - initial?: { type: 'all'|'solo'|'battle', sort: 'name_asc'|'name_desc'|'stake_asc'|'stake_desc', q: string }
 */
export default function GameFilterBar({ onChange, initial }) {
  const [type, setType] = useState(initial?.type ?? 'all')
  const [sort, setSort] = useState(initial?.sort ?? 'name_asc')
  const [q, setQ] = useState(initial?.q ?? '')

  useEffect(() => {
    onChange?.({ type, sort, q })
  }, [type, sort, q, onChange])

  const types = useMemo(
    () => [
      { value: 'all', label: 'All types' },
      { value: 'solo', label: 'Solo' },
      { value: 'battle', label: 'Battle' },
    ],
    []
  )

  const sorts = useMemo(
    () => [
      { value: 'name_asc', label: 'Name ↑' },
      { value: 'name_desc', label: 'Name ↓' },
      { value: 'stake_asc', label: 'Min Stake ↑' },
      { value: 'stake_desc', label: 'Min Stake ↓' },
    ],
    []
  )

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 rounded-xl border bg-white dark:bg-gray-900"
          aria-label="Filter by type"
        >
          {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 rounded-xl border bg-white dark:bg-gray-900"
          aria-label="Sort"
        >
          {sorts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="flex-1 md:max-w-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-900"
          aria-label="Search games"
        />
      </div>
    </div>
  )
}
