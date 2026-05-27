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

  // Fetch split data
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

  // Get assignments for an item
  const getItemAssignments = useCallback(
    (itemId: string) => assignments.filter((a) => a.item_id === itemId),
    [assignments]
  )

  // Check if all items are assigned
  const allAssigned = items.length > 0 && items.every((item) => getItemAssignments(item.id).length > 0)
  const assignedCount = items.filter((item) => getItemAssignments(item.id).length > 0).length

  // Person totals
  const personTotals = split
    ? calculatePersonTotals(people, items, assignments, split.tax, split.tip)
    : []

  // Add a person
  const handleAddPerson = async () => {
    const name = newPersonName.trim()
    if (!name) return

    const color = getAvatarColor(people.length)
    const optimisticPerson: Person = {
      id: `temp-${Date.now()}`,
      split_id: splitId,
      name,
      color,
      venmo_handle: null,
      cashapp_handle: null,
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

  // Toggle item assignment
  const toggleAssignment = async (itemId: string, personId: string) => {
    const existing = assignments.find(
      (a) => a.item_id === itemId && a.person_id === personId
    )

    let newAssignments: Assignment[]

    if (existing) {
      // Remove this assignment
      newAssignments = assignments.filter(
        (a) => !(a.item_id === itemId && a.person_id === personId)
      )
    } else {
      // Add this assignment
      newAssignments = [
        ...assignments,
        {
          id: `temp-${Date.now()}`,
          item_id: itemId,
          person_id: personId,
          share_fraction: 1,
        },
      ]
    }

    // Recalculate share fractions for this item
    const itemAssignees = newAssignments.filter((a) => a.item_id === itemId)
    const fraction = itemAssignees.length > 0 ? 1 / itemAssignees.length : 0
    newAssignments = newAssignments.map((a) =>
      a.item_id === itemId ? { ...a, share_fraction: fraction } : a
    )

    setAssignments(newAssignments)

    // Fire API call
    try {
      if (existing) {
        await fetch(`/api/splits/${splitId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'assign_item',
            item_id: itemId,
            person_id: personId,
            share_fraction: 0,
          }),
        })
      } else {
        await fetch(`/api/splits/${splitId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'assign_item',
            item_id: itemId,
            person_id: personId,
            share_fraction: fraction,
          }),
        })
      }

      // Update fractions for other assignees of this item
      for (const a of itemAssignees) {
        if (a.person_id !== personId || existing) {
          await fetch(`/api/splits/${splitId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'assign_item',
              item_id: itemId,
              person_id: a.person_id,
              share_fraction: fraction,
            }),
          })
        }
      }
    } catch {
      // Revert on failure — refetch
      const res = await fetch(`/api/splits/${splitId}`)
      const data = await res.json()
      setAssignments(data.assignments)
    }
  }

  // Copy share link
  const copyShareLink = () => {
    navigator.clipboard.writeText(`${appUrl}/s/${splitId}/guest`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Complete split
  const handleComplete = async () => {
    setCompleting(true)
    try {
      await fetch(`/api/splits/${splitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'complete' }),
      })
      const summaryUrl = honorId
        ? `/s/${splitId}/summary?honorId=${honorId}`
        : `/s/${splitId}/summary`
      router.push(summaryUrl)
    } catch {
      alert('Failed to complete split.')
      setCompleting(false)
    }
  }

  // ─── LOADING ───
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </main>
    )
  }

  // ─── NOT FOUND ───
  if (notFound || !split) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <h1 className="text-2xl font-bold text-black">Split not found</h1>
        <Link href="/" className="mt-4 text-sm text-gray-400 underline">
          Go home
        </Link>
      </main>
    )
  }

  const currency = split.currency || 'USD'

  return (
    <main className="min-h-screen bg-white pb-48">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl">←</Link>
          <h1 className="text-lg font-bold text-black">
            {split.restaurant_name || 'Your split'}
          </h1>
        </div>
        <button
          onClick={copyShareLink}
          className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-black transition-colors"
        >
          {copiedLink ? 'Copied!' : 'Share link 🔗'}
        </button>
      </header>

      <div className="px-6">
        {/* Add People */}
        <section className="mt-2">
          <p className="text-sm font-medium text-gray-500">Who&apos;s at the table?</p>

          <div className="mt-3 flex items-start gap-3 overflow-x-auto pb-2">
            {people.map((person) => (
              <button
                key={person.id}
                onClick={() => {
                  if (birthdayMode) {
                    setHonorId(honorId === person.id ? null : person.id)
                  }
                }}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <div
                  className="relative flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: person.color }}
                >
                  {getInitials(person.name)}
                  {birthdayMode && honorId === person.id && (
                    <span className="absolute -top-1 -right-1 text-sm">👑</span>
                  )}
                </div>
                <span className="max-w-[56px] truncate text-xs text-gray-600">{person.name}</span>
              </button>
            ))}

            {/* Add button / input */}
            {addingPerson ? (
              <div className="flex shrink-0 items-center gap-1">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddPerson()
                    if (e.key === 'Escape') {
                      setAddingPerson(false)
                      setNewPersonName('')
                    }
                  }}
                  placeholder="Name"
                  autoFocus
                  className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm text-black outline-none focus:ring-1 focus:ring-gray-300"
                />
                <button
                  onClick={handleAddPerson}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white text-sm"
                >
                  ✓
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingPerson(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-xl text-gray-400 transition-colors hover:border-gray-400"
              >
                +
              </button>
            )}
          </div>

          {people.length === 0 && (
            <p className="mt-2 text-sm text-gray-400">Add people to get started</p>
          )}
        </section>

        {/* Birthday Mode */}
        <section className="mt-6 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎂</span>
            <span className="text-sm font-medium text-black">Birthday mode</span>
          </div>
          <button
            onClick={() => {
              setBirthdayMode(!birthdayMode)
              if (birthdayMode) setHonorId(null)
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              birthdayMode ? 'bg-black' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                birthdayMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </section>

        {birthdayMode && !honorId && people.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">Tap someone above to mark them as the guest of honor</p>
        )}

        {/* Items List */}
        <section className="mt-8">
          <p className="text-sm font-medium text-gray-500">Tap items to assign them</p>

          <div className="mt-3 divide-y divide-gray-100">
            {items.map((item) => {
              const itemAssigns = getItemAssignments(item.id)
              const isAssigned = itemAssigns.length > 0

              return (
                <div key={item.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="text-black">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAssigned ? (
                        <span className="text-xs text-green-500">✓</span>
                      ) : (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
                          unassigned
                        </span>
                      )}
                      <span className="font-medium text-black">
                        {formatCurrency(item.price, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Person assignment bubbles */}
                  {people.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {people.map((person) => {
                        const assigned = itemAssigns.some((a) => a.person_id === person.id)
                        return (
                          <button
                            key={person.id}
                            onClick={() => toggleAssignment(item.id, person.id)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                              assigned
                                ? 'text-white'
                                : 'text-gray-400 ring-1 ring-gray-200'
                            }`}
                            style={
                              assigned
                                ? { backgroundColor: person.color, boxShadow: `0 0 0 2px white, 0 0 0 4px ${person.color}` }
                                : {}
                            }
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
        </section>
      </div>

      {/* Bottom sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-6 pb-6 pt-4">
        {/* Running totals */}
        {people.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
            {personTotals.map((pt) => (
              <div key={pt.person.id} className="flex items-center gap-1 text-xs">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: pt.person.color }}
                />
                <span className="text-gray-600">{pt.person.name}</span>
                <span className="font-medium text-black">
                  {birthdayMode && honorId === pt.person.id
                    ? '$0.00'
                    : formatCurrency(pt.grandTotal, currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        <p className={`mb-3 text-center text-xs ${allAssigned ? 'font-medium text-green-600' : 'text-gray-400'}`}>
          {allAssigned
            ? 'All items assigned ✓'
            : `${assignedCount} of ${items.length} items assigned`}
        </p>

        {/* CTA */}
        <button
          onClick={handleComplete}
          disabled={!allAssigned || completing}
          className="w-full rounded-full bg-black py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {completing ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </span>
          ) : (
            'View Summary →'
          )}
        </button>
      </div>
    </main>
  )
}
