'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency, getAvatarColor, getInitials, calculatePersonTotals, saveSplitToHistory } from '@/lib/utils'
import { Split, ReceiptItem, Person, Assignment } from '@/lib/types'

export default function AssignPage() {
  const router = useRouter()
  const params = useParams()
  const splitId = params.id as string

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [split, setSplit] = useState<Split | null>(null)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])

  const [addingPerson, setAddingPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [birthdayMode, setBirthdayMode] = useState(false)
  const [honorId, setHonorId] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [completing, setCompleting] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/splits/${splitId}`)
        if (!res.ok) throw new Error('not found')
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setSplit(data.split)
        setItems(data.items)
        setPeople(data.people)
        setAssignments(data.assignments)
        saveSplitToHistory({
          id: data.split.id,
          share_code: data.split.share_code,
          restaurant_name: data.split.restaurant_name,
          total: data.split.total,
          currency: data.split.currency,
          created_at: data.split.created_at,
          person_count: data.people.length,
        })
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [splitId])

  const getItemAssignments = useCallback(
    (itemId: string) => assignments.filter((a) => a.item_id === itemId),
    [assignments]
  )

  const allAssigned = items.length > 0 && items.every((item) => getItemAssignments(item.id).length > 0)
  const assignedCount = items.filter((item) => getItemAssignments(item.id).length > 0).length

  const personTotals = split
    ? calculatePersonTotals(people, items, assignments, split.tax, split.tip)
    : []

  const handleAddPerson = async () => {
    const name = newPersonName.trim()
    if (!name) return
    const color = getAvatarColor(people.length)
    const optimisticPerson: Person = {
      id: `temp-${Date.now()}`, split_id: splitId, name, color, venmo_handle: null, cashapp_handle: null,
    }
    setPeople((prev) => [...prev, optimisticPerson])
    setNewPersonName('')
    setAddingPerson(false)
    try {
      const res = await fetch(`/api/splits/${splitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'add_person', name, color }),
      })
      const data = await res.json()
      setPeople((prev) => prev.map((p) => (p.id === optimisticPerson.id ? data : p)))
    } catch {
      setPeople((prev) => prev.filter((p) => p.id !== optimisticPerson.id))
    }
  }

  const toggleAssignment = async (itemId: string, personId: string) => {
    const existing = assignments.find((a) => a.item_id === itemId && a.person_id === personId)
    let newAssignments: Assignment[]
    if (existing) {
      newAssignments = assignments.filter((a) => !(a.item_id === itemId && a.person_id === personId))
    } else {
      newAssignments = [...assignments, { id: `temp-${Date.now()}`, item_id: itemId, person_id: personId, share_fraction: 1 }]
    }
    const itemAssignees = newAssignments.filter((a) => a.item_id === itemId)
    const fraction = itemAssignees.length > 0 ? 1 / itemAssignees.length : 0
    newAssignments = newAssignments.map((a) => a.item_id === itemId ? { ...a, share_fraction: fraction } : a)
    setAssignments(newAssignments)
    try {
      if (existing) {
        await fetch(`/api/splits/${splitId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'assign_item', item_id: itemId, person_id: personId, share_fraction: 0 }) })
      } else {
        await fetch(`/api/splits/${splitId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'assign_item', item_id: itemId, person_id: personId, share_fraction: fraction }) })
      }
      for (const a of itemAssignees) {
        if (a.person_id !== personId || existing) {
          await fetch(`/api/splits/${splitId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'assign_item', item_id: itemId, person_id: a.person_id, share_fraction: fraction }) })
        }
      }
    } catch {
      const res = await fetch(`/api/splits/${splitId}`)
      const data = await res.json()
      setAssignments(data.assignments)
    }
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${appUrl}/s/${splitId}/guest`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await fetch(`/api/splits/${splitId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'complete' }) })
      const summaryUrl = honorId ? `/s/${splitId}/summary?honorId=${honorId}` : `/s/${splitId}/summary`
      router.push(summaryUrl)
    } catch {
      alert('Failed to complete split.')
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </main>
    )
  }

  if (notFound || !split) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5">
        <h1 className="text-[18px] font-semibold text-black">Split not found</h1>
        <Link href="/" className="mt-3 text-xs underline" style={{ color: '#888' }}>Go home</Link>
      </main>
    )
  }

  const currency = split.currency || 'USD'

  return (
    <main className="min-h-screen bg-white pb-56">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: '#f5f5f5' }}>
            <span className="text-sm">←</span>
          </Link>
          <div>
            <p className="text-[16px] font-semibold" style={{ letterSpacing: '-0.3px' }}>
              {split.restaurant_name || 'Your split'}
            </p>
            <p className="text-xs" style={{ color: '#999' }}>Tap items to assign</p>
          </div>
        </div>
        <button onClick={copyShareLink} className="text-xs" style={{ color: '#888' }}>
          {copiedLink ? 'Copied!' : 'Share 🔗'}
        </button>
      </header>

      {/* People */}
      <div className="no-scrollbar flex items-start gap-3 overflow-x-auto px-5 py-4">
        {people.map((person) => (
          <button
            key={person.id}
            onClick={() => { if (birthdayMode) setHonorId(honorId === person.id ? null : person.id) }}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div
              className="relative flex h-[44px] w-[44px] items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: person.color }}
            >
              {getInitials(person.name)}
              {birthdayMode && honorId === person.id && (
                <span className="absolute -top-1.5 -right-1 text-sm">👑</span>
              )}
            </div>
            <span className="max-w-[52px] truncate text-[11px]" style={{ color: '#666' }}>{person.name}</span>
          </button>
        ))}

        {addingPerson ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddPerson()
                if (e.key === 'Escape') { setAddingPerson(false); setNewPersonName('') }
              }}
              placeholder="Name"
              autoFocus
              className="w-20 rounded-[10px] px-2.5 py-2 text-sm text-black"
              style={{ background: '#f5f5f5' }}
            />
            <button onClick={handleAddPerson} className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs text-white">
              ✓
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingPerson(true)}
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-xl"
            style={{ border: '1.5px dashed #ccc', color: '#ccc' }}
          >
            +
          </button>
        )}
      </div>

      {people.length === 0 && (
        <p className="px-5 text-xs" style={{ color: '#bbb' }}>Add people to get started</p>
      )}

      {/* Birthday mode */}
      <div className="mx-5 flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <span>🎂</span>
          <span className="text-sm text-black">Birthday mode</span>
        </div>
        <button
          onClick={() => { setBirthdayMode(!birthdayMode); if (birthdayMode) setHonorId(null) }}
          className="relative rounded-full transition-colors"
          style={{ width: 44, height: 26, background: birthdayMode ? '#000' : '#e0e0e0', borderRadius: 13 }}
        >
          <span
            className="absolute top-[3px] left-[3px] block rounded-full bg-white transition-transform"
            style={{ width: 20, height: 20, transform: birthdayMode ? 'translateX(18px)' : 'translateX(0)' }}
          />
        </button>
      </div>

      {birthdayMode && !honorId && people.length > 0 && (
        <p className="px-5 text-xs" style={{ color: '#bbb' }}>Tap someone above to mark as guest of honor</p>
      )}

      {/* Items */}
      <div className="mt-2 px-5">
        <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>Items</p>

        <div className="mt-2">
          {items.map((item) => {
            const itemAssigns = getItemAssignments(item.id)
            const isAssigned = itemAssigns.length > 0

            return (
              <div key={item.id} className="py-3" style={{ borderBottom: '0.5px solid #f5f5f5' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black">{item.name}</span>
                  <div className="flex items-center gap-2">
                    {isAssigned ? (
                      <span className="text-xs" style={{ color: '#34c759' }}>✓</span>
                    ) : (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: '#f5f5f5', color: '#ccc' }}>
                        unassigned
                      </span>
                    )}
                    <span className="text-sm font-bold text-black">{formatCurrency(item.price, currency)}</span>
                  </div>
                </div>

                {people.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {people.map((person) => {
                      const assigned = itemAssigns.some((a) => a.person_id === person.id)
                      return (
                        <button
                          key={person.id}
                          onClick={() => toggleAssignment(item.id, person.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold text-white transition-opacity"
                          style={{
                            backgroundColor: person.color,
                            opacity: assigned ? 1 : 0.3,
                          }}
                          title={person.name}
                        >
                          {getInitials(person.name)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-5 pb-8 pt-3" style={{ borderTop: '0.5px solid #f0f0f0' }}>
        {/* Running totals */}
        {people.length > 0 && (
          <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
            {personTotals.map((pt) => (
              <div key={pt.person.id} className="shrink-0 rounded-[12px] px-3 py-2" style={{ background: '#f9f9f9' }}>
                <p className="text-[10px]" style={{ color: '#999' }}>{pt.person.name}</p>
                <p className="text-[13px] font-bold text-black">
                  {birthdayMode && honorId === pt.person.id ? '$0.00' : formatCurrency(pt.grandTotal, currency)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        <p className="mb-2 text-center text-xs" style={{ color: allAssigned ? '#34c759' : '#999' }}>
          {allAssigned ? 'All items assigned ✓' : `${assignedCount} of ${items.length} items assigned`}
        </p>

        {/* CTA */}
        <button
          onClick={handleComplete}
          disabled={!allAssigned || completing}
          className="w-full rounded-[14px] bg-black py-[15px] text-[15px] font-semibold text-white disabled:opacity-[0.35]"
        >
          {completing ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </span>
          ) : (
            'View summary →'
          )}
        </button>
      </div>
    </main>
  )
}
