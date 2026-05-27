'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatCurrency, calculatePersonTotals, saveTripToHistory } from '@/lib/utils'
import { Split, Person, ReceiptItem, Assignment } from '@/lib/types'

export default function TripPage() {
  const params = useParams()
  const tripId = params.id as string

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tripName, setTripName] = useState('')
  const [splits, setSplits] = useState<Split[]>([])
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [allItems, setAllItems] = useState<ReceiptItem[]>([])
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([])
  const [copiedLink, setCopiedLink] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/trips/${tripId}`)
        if (!res.ok) throw new Error('not found')
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setTripName(data.trip.name)
        setSplits(data.splits)
        setAllPeople(data.people)
        setAllItems(data.items)
        setAllAssignments(data.assignments)

        const totalAmount = (data.splits as Split[]).reduce((sum: number, s: Split) => sum + s.total, 0)
        saveTripToHistory({
          id: data.trip.id,
          name: data.trip.name,
          created_at: data.trip.created_at,
          split_count: data.splits.length,
          total: totalAmount,
        })
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tripId])

  // Calculate combined totals by person name (case-insensitive)
  const combinedTotals = (() => {
    const byName: Record<string, { name: string, color: string, total: number }> = {}

    for (const split of splits) {
      const splitPeople = allPeople.filter((p) => p.split_id === split.id)
      const splitItems = allItems.filter((i) => i.split_id === split.id)
      const splitItemIds = splitItems.map((i) => i.id)
      const splitAssignments = allAssignments.filter((a) => splitItemIds.includes(a.item_id))

      const totals = calculatePersonTotals(splitPeople, splitItems, splitAssignments, split.tax, split.tip)

      for (const pt of totals) {
        const key = pt.person.name.toLowerCase()
        if (!byName[key]) {
          byName[key] = { name: pt.person.name, color: pt.person.color, total: 0 }
        }
        byName[key].total += pt.grandTotal
      }
    }

    return Object.values(byName).sort((a, b) => b.total - a.total)
  })()

  const handleAddReceipt = () => {
    localStorage.setItem('pending_trip_id', tripId)
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${appUrl}/trip/${tripId}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <h1 className="text-2xl font-bold text-black">Trip not found</h1>
        <Link href="/" className="mt-4 text-sm text-gray-400 underline">Go home</Link>
      </main>
    )
  }

  const tripTotal = splits.reduce((sum, s) => sum + s.total, 0)

  return (
    <main className="min-h-screen bg-white px-6 py-5 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-2xl">←</Link>
        <button
          onClick={copyShareLink}
          className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-black"
        >
          {copiedLink ? 'Copied!' : 'Share trip 🔗'}
        </button>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-black">{tripName}</h1>
      <p className="mt-1 text-sm text-gray-400">
        {splits.length} receipt{splits.length !== 1 ? 's' : ''} &bull; {formatCurrency(tripTotal)}
      </p>

      {/* Splits list */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-gray-500">Receipts</h2>
        <div className="mt-3 space-y-3">
          {splits.map((split) => (
            <Link
              key={split.id}
              href={`/s/${split.id}/summary`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg">
                🧾
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-black">
                  {split.restaurant_name || 'Unnamed receipt'}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(split.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <span className="font-semibold text-black">{formatCurrency(split.total, split.currency)}</span>
            </Link>
          ))}
        </div>

        <Link
          href={`/split/new?trip_id=${tripId}`}
          onClick={handleAddReceipt}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-medium text-gray-400 transition-colors hover:border-gray-400 hover:text-black"
        >
          + Add another receipt
        </Link>
      </section>

      {/* Combined totals */}
      {combinedTotals.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-gray-500">Combined totals</h2>
          <div className="mt-3 space-y-2">
            {combinedTotals.map((person) => (
              <div
                key={person.name}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: person.color }}
                  />
                  <span className="text-sm text-black">{person.name}</span>
                </div>
                <span className="text-sm font-semibold text-black">
                  {formatCurrency(person.total)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
