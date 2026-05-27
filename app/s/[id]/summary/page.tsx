'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import html2canvas from 'html2canvas'
import { formatCurrency, calculatePersonTotals } from '@/lib/utils'
import { Split, ReceiptItem, Person, Assignment, PersonTotal } from '@/lib/types'
import PersonAvatar from '@/components/PersonAvatar'
import PaymentButton from '@/components/PaymentButton'
import ShareCard from '@/components/ShareCard'
import NudgeModal from '@/components/NudgeModal'

export default function SummaryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const splitId = params.id as string
  const honorId = searchParams.get('honorId')

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [split, setSplit] = useState<Split | null>(null)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)
  const [nudgePerson, setNudgePerson] = useState<Person | null>(null)
  const [venmoHandles, setVenmoHandles] = useState<Record<string, string>>({})
  const [cashappHandles, setCashappHandles] = useState<Record<string, string>>({})
  const [copiedSummary, setCopiedSummary] = useState(false)

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

        const vh: Record<string, string> = {}
        const ch: Record<string, string> = {}
        for (const p of data.people) {
          if (p.venmo_handle) vh[p.id] = p.venmo_handle
          if (p.cashapp_handle) ch[p.id] = p.cashapp_handle
        }
        setVenmoHandles(vh)
        setCashappHandles(ch)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [splitId])

  // Calculate person totals with birthday redistribution
  const getPersonTotals = useCallback((): PersonTotal[] => {
    if (!split) return []
    let totals = calculatePersonTotals(people, items, assignments, split.tax, split.tip)

    if (honorId) {
      const honoree = totals.find((t) => t.person.id === honorId)
      if (honoree && totals.length > 1) {
        const honoreeTotal = honoree.grandTotal
        const others = totals.filter((t) => t.person.id !== honorId)
        const redistribution = honoreeTotal / others.length
        totals = totals.map((t) => {
          if (t.person.id === honorId) {
            return { ...t, grandTotal: 0 }
          }
          return { ...t, grandTotal: t.grandTotal + redistribution }
        })
      }
    }

    return totals
  }, [split, people, items, assignments, honorId])

  const personTotals = getPersonTotals()

  // Get items assigned to a person
  const getPersonItems = (personId: string) => {
    const personAssigns = assignments.filter((a) => a.person_id === personId)
    return personAssigns.map((a) => {
      const item = items.find((i) => i.id === a.item_id)
      return { item, shareFraction: a.share_fraction }
    }).filter((x) => x.item)
  }

  // Save as image
  const saveAsImage = async () => {
    const el = document.getElementById('share-card')
    if (!el) return
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 })
    const link = document.createElement('a')
    link.download = 'splitcheck.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  // Copy summary
  const copySummary = () => {
    const name = split?.restaurant_name || 'Dinner'
    const lines = personTotals.map((pt) => {
      if (honorId === pt.person.id) return `${pt.person.name}: 🎂 on us`
      return `${pt.person.name}: ${formatCurrency(pt.grandTotal, currency)}`
    })
    const text = `🧾 ${name}\n${lines.join('\n')}\nTotal: ${formatCurrency(split?.total || 0, currency)}\nSplit with SplitCheck ✓`
    navigator.clipboard.writeText(text)
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2000)
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
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <h1 className="text-2xl font-bold text-black">Split not found</h1>
        <Link href="/" className="mt-4 text-sm text-gray-400 underline">Go home</Link>
      </main>
    )
  }

  const currency = split.currency || 'USD'
  const formattedDate = new Date(split.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="min-h-screen bg-white pb-32">
      {/* Header */}
      <header className="px-6 py-5">
        <Link href={`/s/${splitId}`} className="text-2xl">←</Link>
        <h1 className="mt-3 text-2xl font-bold text-black">
          {split.restaurant_name || 'Your split'}
        </h1>
        <p className="mt-1 text-sm text-gray-400">{formattedDate}</p>
      </header>

      <div className="px-6">
        {/* Total banner */}
        <div className="rounded-2xl bg-black p-5">
          <p className="text-xs text-gray-400">Total bill</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {formatCurrency(split.total, currency)}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Split {people.length} way{people.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Person cards */}
        <section className="mt-8 space-y-4">
          {personTotals.map((pt) => {
            const isHonored = honorId === pt.person.id
            const isExpanded = expandedPerson === pt.person.id
            const personItems = getPersonItems(pt.person.id)
            const ptTotal = personTotals.find((t) => t.person.id === pt.person.id)

            return (
              <div key={pt.person.id} className="rounded-xl bg-gray-50 p-4">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PersonAvatar
                      name={pt.person.name}
                      color={pt.person.color}
                      showCrown={isHonored}
                    />
                    <span className="font-medium text-black">{pt.person.name}</span>
                  </div>
                  <div className="text-right">
                    {isHonored ? (
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-black">$0.00</span>
                        <span>🎂</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-black">
                        {formatCurrency(pt.grandTotal, currency)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment buttons */}
                {!isHonored && (
                  <div className="mt-3 flex gap-2">
                    <PaymentButton
                      type="venmo"
                      personName={pt.person.name}
                      amount={pt.grandTotal}
                      restaurantName={split.restaurant_name}
                      handle={venmoHandles[pt.person.id] || null}
                      onSaveHandle={(h) => setVenmoHandles((prev) => ({ ...prev, [pt.person.id]: h }))}
                    />
                    <PaymentButton
                      type="cashapp"
                      personName={pt.person.name}
                      amount={pt.grandTotal}
                      restaurantName={split.restaurant_name}
                      handle={cashappHandles[pt.person.id] || null}
                      onSaveHandle={(h) => setCashappHandles((prev) => ({ ...prev, [pt.person.id]: h }))}
                    />
                    <PaymentButton
                      type="zelle"
                      personName={pt.person.name}
                      amount={pt.grandTotal}
                      restaurantName={split.restaurant_name}
                      handle={null}
                      onSaveHandle={() => {}}
                    />
                  </div>
                )}

                {/* Item breakdown toggle */}
                <button
                  onClick={() => setExpandedPerson(isExpanded ? null : pt.person.id)}
                  className="mt-3 text-xs text-gray-400 transition-colors hover:text-black"
                >
                  {isExpanded ? 'Hide details ↑' : `See what ${pt.person.name} had →`}
                </button>

                {isExpanded && (
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    {personItems.map(({ item, shareFraction }) => (
                      <div key={item!.id} className="flex justify-between py-1 text-xs">
                        <span className="text-gray-600">
                          {item!.name}
                          {shareFraction < 1 && (
                            <span className="ml-1 text-gray-400">
                              (1/{Math.round(1 / shareFraction)} share)
                            </span>
                          )}
                        </span>
                        <span className="text-black">
                          {formatCurrency(item!.price * shareFraction, currency)}
                        </span>
                      </div>
                    ))}
                    <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>Items subtotal</span>
                        <span>{formatCurrency(ptTotal?.itemsTotal || 0, currency)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Tax share</span>
                        <span>{formatCurrency(ptTotal?.taxShare || 0, currency)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Tip share</span>
                        <span>{formatCurrency(ptTotal?.tipShare || 0, currency)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </section>

        {/* Share Card Section */}
        <section className="mt-10">
          <h3 className="text-lg font-bold text-black">Share with the group</h3>
          <div className="mt-4 flex justify-center">
            <ShareCard
              restaurantName={split.restaurant_name}
              date={split.created_at}
              personTotals={personTotals}
              total={split.total}
              currency={currency}
              honorId={honorId}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveAsImage}
              className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-50"
            >
              📸 Save as image
            </button>
            <button
              onClick={copySummary}
              className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-50"
            >
              {copiedSummary ? 'Copied!' : '📋 Copy summary'}
            </button>
          </div>
        </section>

        {/* Nudge section */}
        <section className="mt-10">
          <h3 className="text-lg font-bold text-black">Need to collect? Send a reminder</h3>
          <div className="mt-4 space-y-2">
            {personTotals
              .filter((pt) => pt.person.id !== honorId && pt.grandTotal > 0)
              .map((pt) => (
                <button
                  key={pt.person.id}
                  onClick={() => setNudgePerson(pt.person)}
                  className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm transition-colors hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: pt.person.color }}
                    />
                    <span className="text-black">Remind {pt.person.name}</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
              ))}
          </div>
        </section>

        {/* Done button */}
        <div className="mt-10">
          <Link
            href="/split/new"
            className="block w-full rounded-full bg-black py-3.5 text-center text-base font-semibold text-white transition-opacity hover:opacity-80"
          >
            Start a new split
          </Link>
        </div>
      </div>

      {/* Nudge Modal */}
      {nudgePerson && (
        <NudgeModal
          person={nudgePerson}
          amount={personTotals.find((pt) => pt.person.id === nudgePerson.id)?.grandTotal || 0}
          restaurantName={split.restaurant_name}
          currency={currency}
          onClose={() => setNudgePerson(null)}
        />
      )}
    </main>
  )
}
