'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency, getInitials, calculatePersonTotals } from '@/lib/utils'
import { Split, ReceiptItem, Person, Assignment } from '@/lib/types'

type GuestState = 'loading' | 'select-person' | 'assign' | 'done'

export default function GuestPage() {
  const params = useParams()
  const splitId = params.id as string

  const [state, setState] = useState<GuestState>('loading')
  const [split, setSplit] = useState<Split | null>(null)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [myItems, setMyItems] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [myTotal, setMyTotal] = useState(0)
  const [notFound, setNotFound] = useState(false)

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
        setState('select-person')
      } catch {
        setNotFound(true)
        setState('loading')
      }
    }
    load()
  }, [splitId])

  // Select yourself
  const handleSelectPerson = (person: Person) => {
    setSelectedPerson(person)
    // Pre-populate any existing assignments for this person
    const existing = assignments
      .filter((a) => a.person_id === person.id)
      .map((a) => a.item_id)
    setMyItems(new Set(existing))
    setState('assign')
  }

  // Toggle item
  const toggleItem = (itemId: string) => {
    setMyItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  // Submit selections
  const handleSubmit = async () => {
    if (!selectedPerson || !split) return
    setSubmitting(true)

    try {
      // For each item, assign or unassign
      for (const item of items) {
        const isSelected = myItems.has(item.id)
        const existingAssignment = assignments.find(
          (a) => a.item_id === item.id && a.person_id === selectedPerson.id
        )

        if (isSelected && !existingAssignment) {
          // Count total assignees for this item including this guest
          const currentAssignees = assignments.filter((a) => a.item_id === item.id).length
          const newFraction = 1 / (currentAssignees + 1)

          await fetch(`/api/splits/${splitId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'assign_item',
              item_id: item.id,
              person_id: selectedPerson.id,
              share_fraction: newFraction,
            }),
          })
        } else if (!isSelected && existingAssignment) {
          await fetch(`/api/splits/${splitId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'assign_item',
              item_id: item.id,
              person_id: selectedPerson.id,
              share_fraction: 0,
            }),
          })
        }
      }

      // Calculate the person's total
      // Build updated assignments to calculate total
      const updatedAssignments: Assignment[] = []
      for (const item of items) {
        const others = assignments.filter(
          (a) => a.item_id === item.id && a.person_id !== selectedPerson.id
        )
        const isMine = myItems.has(item.id)
        const totalCount = others.length + (isMine ? 1 : 0)
        const fraction = totalCount > 0 ? 1 / totalCount : 0

        for (const a of others) {
          updatedAssignments.push({ ...a, share_fraction: fraction })
        }
        if (isMine) {
          updatedAssignments.push({
            id: `guest-${item.id}`,
            item_id: item.id,
            person_id: selectedPerson.id,
            share_fraction: fraction,
          })
        }
      }

      const totals = calculatePersonTotals(
        [selectedPerson],
        items,
        updatedAssignments,
        split.tax,
        split.tip
      )
      setMyTotal(totals[0]?.grandTotal || 0)
      setState('done')
    } catch {
      alert('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // ─── LOADING / NOT FOUND ───
  if (state === 'loading') {
    if (notFound) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
          <h1 className="text-2xl font-bold text-black">Split not found</h1>
          <p className="mt-2 text-sm text-gray-400">This link may have expired.</p>
        </main>
      )
    }
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </main>
    )
  }

  const currency = split?.currency || 'USD'

  // ─── SELECT PERSON ───
  if (state === 'select-person') {
    return (
      <main className="min-h-screen bg-white px-6 py-8">
        <h1 className="text-2xl font-bold text-black">
          {split?.restaurant_name || 'Split the bill'}
        </h1>
        <p className="mt-2 text-gray-500">Which one are you?</p>

        <div className="mt-8 space-y-3">
          {people.map((person) => (
            <button
              key={person.id}
              onClick={() => handleSelectPerson(person)}
              className="flex w-full items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: person.color }}
              >
                {getInitials(person.name)}
              </div>
              <span className="font-medium text-black">{person.name}</span>
            </button>
          ))}
        </div>

        {people.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">
            No one has been added to this split yet.
          </p>
        )}
      </main>
    )
  }

  // ─── DONE ───
  if (state === 'done') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="text-5xl">✅</div>
        <h1 className="mt-4 text-2xl font-bold text-black">You&apos;re all set!</h1>
        <p className="mt-2 text-lg text-gray-500">
          {selectedPerson?.name} owes{' '}
          <span className="font-semibold text-black">
            {formatCurrency(myTotal, currency)}
          </span>
        </p>
      </main>
    )
  }

  // ─── ASSIGN ITEMS ───
  return (
    <main className="min-h-screen bg-white px-6 py-8 pb-32">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: selectedPerson?.color }}
        >
          {selectedPerson ? getInitials(selectedPerson.name) : ''}
        </div>
        <div>
          <h1 className="text-lg font-bold text-black">
            {split?.restaurant_name || 'Your receipt'}
          </h1>
          <p className="text-sm text-gray-500">
            Tap what you had, {selectedPerson?.name}
          </p>
        </div>
      </div>

      <div className="mt-6 divide-y divide-gray-100">
        {items.map((item) => {
          const selected = myItems.has(item.id)
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`flex w-full items-center justify-between py-3 text-left transition-colors ${
                selected ? 'bg-green-50 -mx-3 px-3 rounded-lg' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    selected
                      ? 'bg-green-500 text-white'
                      : 'border border-gray-300'
                  }`}
                >
                  {selected && '✓'}
                </span>
                <span className="text-black">{item.name}</span>
              </div>
              <span className="font-medium text-black">
                {formatCurrency(item.price, currency)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-6">
        <p className="mb-3 text-center text-xs text-gray-400">
          {myItems.size} item{myItems.size !== 1 ? 's' : ''} selected
        </p>
        <button
          onClick={handleSubmit}
          disabled={myItems.size === 0 || submitting}
          className="w-full rounded-full bg-black py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting...
            </span>
          ) : (
            'Done'
          )}
        </button>
      </div>
    </main>
  )
}
