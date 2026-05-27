'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency, getSplitHistory, deleteSplitFromHistory, getTripHistory, SavedSplit, SavedTrip } from '@/lib/utils'

type Tab = 'splits' | 'trips'

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function HistoryPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>('splits')
  const [splits, setSplits] = useState<SavedSplit[]>([])
  const [trips, setTrips] = useState<SavedTrip[]>([])

  useEffect(() => {
    try {
      setSplits(getSplitHistory())
      setTrips(getTripHistory())
    } catch {
      setSplits([])
      setTrips([])
    }
    setMounted(true)
  }, [])

  const handleDelete = (id: string) => {
    try {
      deleteSplitFromHistory(id)
    } catch { /* ignore */ }
    setSplits((prev) => prev.filter((s) => s.id !== id))
  }

  const handleClearAll = () => {
    if (!confirm('Clear all split history?')) return
    try { localStorage.removeItem('splitcheck_history') } catch { /* ignore */ }
    setSplits([])
  }

  // Loading skeleton
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
          <div className="h-8 w-8 rounded-full" style={{ background: '#f5f5f5' }}></div>
          <div className="h-4 w-24 rounded-full" style={{ background: '#f5f5f5' }}></div>
        </div>
        <div className="px-5 pt-6">
          <div className="mb-4 h-6 w-32 rounded-full" style={{ background: '#f5f5f5' }}></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl" style={{ background: '#fafafa' }}></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const totalAmount = splits.reduce((sum, s) => sum + s.total, 0)

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
        <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: '#f5f5f5' }}>
          <span className="text-sm">←</span>
        </Link>
        <p className="text-[16px] font-semibold" style={{ letterSpacing: '-0.3px' }}>Past splits</p>
      </header>

      <div className="px-5 pt-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl p-1" style={{ background: '#f5f5f5' }}>
          <button
            onClick={() => setTab('splits')}
            className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors ${
              tab === 'splits' ? 'bg-white text-black shadow-sm' : 'text-gray-400'
            }`}
          >
            Splits
          </button>
          <button
            onClick={() => setTab('trips')}
            className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors ${
              tab === 'trips' ? 'bg-white text-black shadow-sm' : 'text-gray-400'
            }`}
          >
            Trips
          </button>
        </div>

        {/* Splits tab */}
        {tab === 'splits' && (
          <>
            {splits.length === 0 ? (
              <div className="mt-20 flex flex-col items-center text-center">
                <span className="text-6xl">🧾</span>
                <h2 className="mt-5 text-[18px] font-semibold text-black">No splits yet</h2>
                <p className="mt-2 max-w-[240px] text-[13px]" style={{ color: '#999' }}>
                  Your past splits will show up here
                </p>
                <Link
                  href="/split/new"
                  className="mt-6 block rounded-[14px] bg-black px-8 py-[15px] text-[15px] font-semibold text-white"
                >
                  Scan a receipt →
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-4 flex gap-6 rounded-[14px] px-4 py-3" style={{ background: '#f9f9f9' }}>
                  <div>
                    <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>Splits</p>
                    <p className="text-lg font-bold text-black">{splits.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>Total</p>
                    <p className="text-lg font-bold text-black">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {splits.map((split) => (
                    <div
                      key={split.id}
                      className="flex items-center gap-3 rounded-[16px] p-3.5"
                      style={{ border: '0.5px solid #f0f0f0' }}
                    >
                      <button
                        onClick={() => router.push(`/s/${split.id}/summary`)}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: '#f5f5f5' }}>
                          🧾
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-black">
                            {split.restaurant_name || 'Unnamed receipt'}
                          </p>
                          <p className="text-xs" style={{ color: '#999' }}>{formatDate(split.created_at)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-black">{formatCurrency(split.total, split.currency)}</p>
                          <p className="text-xs" style={{ color: '#999' }}>
                            {split.person_count > 0 ? `${split.person_count} people` : 'Tap to view'}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDelete(split.id)}
                        className="shrink-0 p-1 text-sm"
                        style={{ color: '#ccc' }}
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pb-6 text-center">
                  <button onClick={handleClearAll} className="text-xs" style={{ color: '#ccc' }}>
                    Clear all history
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Trips tab */}
        {tab === 'trips' && (
          <>
            {trips.length === 0 ? (
              <div className="mt-20 flex flex-col items-center text-center">
                <span className="text-6xl">🗺️</span>
                <h2 className="mt-5 text-[18px] font-semibold text-black">No trips yet</h2>
                <p className="mt-2 max-w-[240px] text-[13px]" style={{ color: '#999' }}>
                  Group multiple receipts into a trip to track combined totals
                </p>
                <Link
                  href="/trip/new"
                  className="mt-6 block rounded-[14px] bg-black px-8 py-[15px] text-[15px] font-semibold text-white"
                >
                  Start a trip →
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {trips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => router.push(`/trip/${trip.id}`)}
                    className="flex w-full items-center gap-3 rounded-[16px] p-3.5 text-left"
                    style={{ border: '0.5px solid #f0f0f0' }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: '#f5f5f5' }}>
                      🗺️
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-black">{trip.name}</p>
                      <p className="text-xs" style={{ color: '#999' }}>
                        {trip.split_count} receipt{trip.split_count !== 1 ? 's' : ''} · {formatDate(trip.created_at)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-black">{formatCurrency(trip.total)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
