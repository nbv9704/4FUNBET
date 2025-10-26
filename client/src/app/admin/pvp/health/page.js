// client/src/app/admin/pvp/health/page.js
'use client'

import { useEffect, useMemo, useState } from 'react'
import useApi from '@/hooks/useApi'
import Link from 'next/link'

export default function AdminPvpHealthPage() {
  const api = useApi()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  async function load() {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/admin/pvp/health')
      setData(res)
    } catch (e) {
      setError(e?.message || 'Failed to load health')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, []) // init

  // Auto refresh mỗi 5s
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => load(), 5000)
    return () => clearInterval(id)
  }, [autoRefresh])

  const lastSweepAtText = useMemo(() => {
    const ts = data?.cron?.lastSweepAt
    const iso = data?.cron?.lastSweepIso
    if (!ts) return '-'
    try {
      const d = iso ? new Date(iso) : new Date(ts)
      const agoSec = Math.max(0, Math.round((Date.now() - d.getTime())/1000))
      return `${d.toLocaleString()} (${agoSec}s ago)`
    } catch {
      return String(ts)
    }
  }, [data?.cron?.lastSweepAt, data?.cron?.lastSweepIso])

  const nextSweepAtText = useMemo(() => {
    const ts = data?.cron?.nextSweepAt
    const iso = data?.cron?.nextSweepIso
    if (!ts) return '-'
    try {
      const d = iso ? new Date(iso) : new Date(ts)
      const inSec = Math.max(0, Math.round((d.getTime() - Date.now())/1000))
      return `${d.toLocaleString()} (in ${inSec}s)`
    } catch {
      return String(ts)
    }
  }, [data?.cron?.nextSweepAt, data?.cron?.nextSweepIso])

  const serverNowText = useMemo(() => {
    const ts = data?.serverNow
    const iso = data?.serverNowIso
    if (!ts) return '-'
    try { return (iso ? new Date(iso) : new Date(ts)).toLocaleString() } catch { return String(ts) }
  }, [data?.serverNow, data?.serverNowIso])

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">PvP Health</h1>
          <div className="text-sm opacity-70">Admin only</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-2 rounded border shadow text-sm"
            disabled={loading}
            title="Refresh now"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            Auto refresh (5s)
          </label>
          <Link href="/" className="text-sm underline">Back</Link>
        </div>
      </div>

      {error && <div className="mt-4 text-sm text-red-500">{error}</div>}

      {!error && (
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {/* Summary */}
          <div className="border rounded-2xl p-4">
            <div className="text-lg font-semibold mb-2">Summary</div>
            <div className="text-sm space-y-1">
              <div>Server now: <b>{serverNowText}</b></div>
              <div>Cron sweep interval: <b>{(data?.cron?.sweepIntervalMs ?? 0) / 1000}s</b></div>
              <div>Last sweep at: <b>{lastSweepAtText}</b></div>
              <div>Next sweep at: <b>{nextSweepAtText}</b></div>
              <div>Uptime: <b>{(data?.uptimeSec ?? 0)}s</b></div>
            </div>
          </div>

          {/* Counts by status */}
          <div className="border rounded-2xl p-4">
            <div className="text-lg font-semibold mb-2">Rooms by status</div>
            {data?.counts ? (
              <ul className="text-sm space-y-1">
                {Object.entries(data.counts).map(([k,v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="capitalize">{k}</span>
                    <b>{v}</b>
                  </li>
                ))}
              </ul>
            ) : <div className="text-sm opacity-70">No data</div>}
          </div>

          {/* Stale queues */}
          <div className="border rounded-2xl p-4 md:col-span-2">
            <div className="text-lg font-semibold mb-2">Stale Pending</div>
            {data?.stale ? (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border p-3">
                  <div className="opacity-70">Coinflip (revealAt passed)</div>
                  <div className="text-2xl font-bold">{data.stale.coinflip}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="opacity-70">Dice (advanceAt passed)</div>
                  <div className="text-2xl font-bold">{data.stale.dice}</div>
                </div>
              </div>
            ) : <div className="text-sm opacity-70">No data</div>}
          </div>

          {/* Raw JSON */}
          <div className="border rounded-2xl p-4 md:col-span-2">
            <div className="text-lg font-semibold mb-2">Raw payload</div>
            <pre className="text-xs bg-black/5 dark:bg-white/10 rounded p-3 overflow-auto">
{JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
