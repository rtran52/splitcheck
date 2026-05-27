'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveTripToHistory } from '@/lib/utils'

const TRIP_SUGGESTIONS = ['Vegas Weekend', 'Europe Trip', 'Coachella 2026', 'Beach House', 'NYC Getaway', 'Ski Trip']

export default function TripNewPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  async function handleCreate() {
    if (!name.trim() || isCreating) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (data.id) {
        saveTripToHistory({
          id: data.id,
          name: data.name,
          created_at: data.created_at,
          split_count: 0,
          total: 0,
        })
        router.push(`/trip/${data.id}`)
      }
    } catch {
      setIsCreating(false)
    }
  }

  return (
    <main className="min-h-screen bg-white max-w-md mx-auto">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-50">
        <Link href="/" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-[14px]">←</Link>
        <div>
          <p className="text-[15px] font-black text-black">Start a trip</p>
          <p className="text-[11px] text-gray-400">Group multiple receipts together</p>
        </div>
      </div>

      <div className="px-5 pt-8">
        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-2">Trip name</p>
        <input
          type="text"
          placeholder="e.g. Vegas Weekend"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="w-full text-[20px] font-black text-black placeholder:text-gray-200 outline-none border-b-2 border-gray-100 focus:border-black pb-3 transition-colors bg-transparent"
          autoFocus
        />

        <div className="mt-5">
          <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-3">Popular trip types</p>
          <div className="flex flex-wrap gap-2">
            {TRIP_SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => setName(s)}
                className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all active:scale-95 ${
                  name === s
                    ? 'bg-black text-white border-black'
                    : 'bg-gray-50 text-gray-600 border-gray-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className={`w-full flex items-center justify-between rounded-2xl px-5 py-4 text-[15px] font-bold transition-all ${
              name.trim() && !isCreating
                ? 'bg-black text-white active:scale-[0.98]'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            <span>{isCreating ? 'Creating...' : 'Start trip'}</span>
            {!isCreating && <span>→</span>}
            {isCreating && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-gray-300 mt-4">
          Add receipts to your trip as you go
        </p>
      </div>
    </main>
  )
}
