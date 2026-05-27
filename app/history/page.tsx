'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency, getSplitHistory, deleteSplitFromHistory, getTripHistory, SavedSplit, SavedTrip } from '@/lib/utils'

type Tab = 'splits' | 'trips'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function HistoryPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('splits')
  const [splits, setSplits] = useState<SavedSplit[]>([])
  const [trips, setTrips] = useState<SavedTrip[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSplits(getSplitHistory())
    setTrips(getTripHistory())
    setLoaded(true)
  }, [])

  const handleDelete = (id: string) => {
    deleteSplitFromHistory(id)
    setSplits((prev) => prev.filter((s) => s.id !== id))
  }

  const handleClearAll = () => {
    if (!confirm('Clear all split history?')) return
    localStorage.removeItem('splitcheck_history')
    setSplits([])
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </main>
    )
  }

  const totalAmount = splits.reduce((sum, s) => sum + s.total, 0)

  return (
    <main className="min-h-screen bg-white px-6 py-5">
      {/* Header */}
      <Link href="/" className="inline-block text-2xl">←</Link>
      <h1 className="mt-4 text-2xl font-bold text-black">Past splits</h1>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setTab('splits')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            tab === 'splits' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
          }`}
        >
          Splits
        </button>
        <button
          onClick={() => setTab('trips')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            tab === 'trips' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
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
              <h2 className="mt-6 text-xl font-bold text-black">No splits yet</h2>
              <p className="mt-2 max-w-xs text-sm text-gray-400">
                Your past splits will appear here after you scan your first receipt
              </p>
              <Link
                href="/split/new"
                className="mt-8 inline-block rounded-full bg-black px-8 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-80"
              >
                Scan a receipt →
              </Link>
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div className="mt-6 flex gap-6 rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-xs text-gray-400">Splits</p>
                  <p className="text-lg font-bold text-black">{splits.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total split</p>
                  <p className="text-lg font-bold text-black">{formatCurrency(totalAmount)}</p>
                </div>
              </div>

              {/* Splits list */}
              <div className="mt-6 space-y-3">
                {splits.map((split) => (
                  <div
                    key={split.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                  >
                    <button
                      onClick={() => router.push(`/s/${split.id}/summary`)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg">
                        🧾
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-black">
                          {split.restaurant_name || 'Unnamed receipt'}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(split.created_at)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-black">
                          {formatCurrency(split.total, split.currency)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {split.person_count > 0 ? `${split.person_count} people` : 'Tap to view'}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDelete(split.id)}
                      className="shrink-0 rounded-full p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Remove from history"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-400 transition-colors hover:text-red-500"
                >
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
              <h2 className="mt-6 text-xl font-bold text-black">No trips yet</h2>
              <p className="mt-2 max-w-xs text-sm text-gray-400">
                Group multiple receipts into a trip to track combined totals
              </p>
              <Link
                href="/trip/new"
                className="mt-8 inline-block rounded-full bg-black px-8 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-80"
              >
                Start a trip →
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => router.push(`/trip/${trip.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg">
                    🗺️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-black">{trip.name}</p>
                    <p className="text-xs text-gray-400">
                      {trip.split_count} receipt{trip.split_count !== 1 ? 's' : ''} &bull; {formatDate(trip.created_at)}
                    </p>
                  </div>
                  <span className="font-semibold text-black">{formatCurrency(trip.total)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
