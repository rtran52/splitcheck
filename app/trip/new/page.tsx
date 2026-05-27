'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveTripToHistory } from '@/lib/utils'

export default function NewTripPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create trip')
      const trip = await res.json()
      saveTripToHistory({
        id: trip.id,
        name: trip.name,
        created_at: trip.created_at,
        split_count: 0,
        total: 0,
      })
      router.push(`/trip/${trip.id}`)
    } catch {
      alert('Failed to create trip. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-5">
      <Link href="/" className="inline-block text-2xl">←</Link>

      <div className="mt-10">
        <h1 className="text-2xl font-bold text-black">Name your trip</h1>
        <p className="mt-1 text-gray-500">Group multiple receipts together</p>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
        placeholder='e.g. "Vegas Weekend", "Europe Trip"'
        autoFocus
        className="mt-8 w-full rounded-xl border border-gray-200 px-4 py-3 text-lg text-black outline-none focus:ring-1 focus:ring-gray-300"
      />

      <button
        onClick={handleCreate}
        disabled={!name.trim() || submitting}
        className="mt-6 w-full rounded-full bg-black py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {submitting ? 'Creating...' : 'Start trip →'}
      </button>
    </main>
  )
}
