'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import html2canvas from 'html2canvas'
import { formatCurrency, calculatePersonTotals, getInitials } from '@/lib/utils'
import { Split, ReceiptItem, Person, Assignment, PersonTotal } from '@/lib/types'
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
          if (t.person.id === honorId) return { ...t, grandTotal: 0 }
          return { ...t, grandTotal: t.grandTotal + redistribution }
        })
      }
    }
    return totals
  }, [split, people, items, assignments, honorId])

  const personTotals = getPersonTotals()

  const getPersonItems = (personId: string) => {
    const personAssigns = assignments.filter((a) => a.person_id === personId)
    return personAssigns.map((a) => {
      const item = items.find((i) => i.id === a.item_id)
      return { item, shareFraction: a.share_fraction }
    }).filter((x) => x.item)
  }

  const saveAsImage = async () => {
    const el = document.getElementById('share-card')
    if (!el) return
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 })
    const link = document.createElement('a')
    link.download = 'splitcheck.png'
    link.href = canvas.toDataURL()
    link.click()
  }

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
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5">
        <h1 className="text-[18px] font-semibold text-black">Split not found</h1>
        <Link href="/" className="mt-3 text-xs underline" style={{ color: '#888' }}>Go home</Link>
      </main>
    )
  }

  const currency = split.currency || 'USD'
  const formattedDate = new Date(split.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const avgPerPerson = people.length > 0 ? split.total / people.length : split.total

  return (
    <main className="min-h-screen bg-white pb-32">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
        <Link href={`/s/${splitId}`} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: '#f5f5f5' }}>
          <span className="text-sm">←</span>
        </Link>
        <div>
          <p className="text-[16px] font-semibold" style={{ letterSpacing: '-0.3px' }}>
            {split.restaurant_name || 'Your split'}
          </p>
          <p className="text-xs" style={{ color: '#999' }}>{formattedDate}</p>
        </div>
      </header>

      {/* Total banner */}
      <div className="mx-5 mt-4 rounded-[20px] bg-black p-5">
        <p className="text-xs" style={{ color: '#888' }}>Total bill</p>
        <p className="mt-1 text-[36px] font-bold text-white" style={{ letterSpacing: '-1px' }}>
          {formatCurrency(split.total, currency)}
        </p>
        <p className="mt-1 text-[13px]" style={{ color: '#666' }}>
          Split {people.length} way{people.length !== 1 ? 's' : ''} · {formatCurrency(avgPerPerson, currency)} avg
        </p>
      </div>

      {/* Person cards */}
      <div className="mt-4 space-y-2.5 px-5">
        {personTotals.map((pt) => {
          const isHonored = honorId === pt.person.id
          const isExpanded = expandedPerson === pt.person.id
          const personItems = getPersonItems(pt.person.id)
          const ptData = personTotals.find((t) => t.person.id === pt.person.id)

          return (
            <div key={pt.person.id} className="p-3.5" style={{ border: '0.5px solid #f0f0f0', borderRadius: 16 }}>
              {/* Top row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: pt.person.color }}
                  >
                    {getInitials(pt.person.name)}
                    {isHonored && <span className="absolute -top-1.5 -right-1 text-xs">👑</span>}
                  </div>
                  <span className="text-[15px] font-semibold text-black">{pt.person.name}</span>
                </div>
                {isHonored ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[22px] font-bold text-black">$0.00</span>
                    <span>🎂</span>
                  </div>
                ) : (
                  <span className="text-[22px] font-bold text-black">{formatCurrency(pt.grandTotal, currency)}</span>
                )}
              </div>

              {/* Payment buttons */}
              {!isHonored && (
                <div className="mt-3 flex gap-2">
                  <PaymentButton type="venmo" personName={pt.person.name} amount={pt.grandTotal} restaurantName={split.restaurant_name} handle={venmoHandles[pt.person.id] || null} onSaveHandle={(h) => setVenmoHandles((prev) => ({ ...prev, [pt.person.id]: h }))} />
                  <PaymentButton type="cashapp" personName={pt.person.name} amount={pt.grandTotal} restaurantName={split.restaurant_name} handle={cashappHandles[pt.person.id] || null} onSaveHandle={(h) => setCashappHandles((prev) => ({ ...prev, [pt.person.id]: h }))} />
                  <PaymentButton type="zelle" personName={pt.person.name} amount={pt.grandTotal} restaurantName={split.restaurant_name} handle={null} onSaveHandle={() => {}} />
                </div>
              )}

              {/* Breakdown toggle */}
              <button
                onClick={() => setExpandedPerson(isExpanded ? null : pt.person.id)}
                className="mt-3 text-xs" style={{ color: '#999' }}
              >
                {isExpanded ? 'Hide breakdown ↑' : 'See breakdown →'}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid #f0f0f0' }}>
                  {personItems.map(({ item, shareFraction }) => (
                    <div key={item!.id} className="flex justify-between py-1 text-xs">
                      <span style={{ color: '#666' }}>
                        {item!.name}
                        {shareFraction < 1 && (
                          <span className="ml-1" style={{ color: '#bbb' }}>(1/{Math.round(1 / shareFraction)} share)</span>
                        )}
                      </span>
                      <span className="text-black">{formatCurrency(item!.price * shareFraction, currency)}</span>
                    </div>
                  ))}
                  <div className="mt-2 space-y-1 pt-2 text-xs" style={{ borderTop: '0.5px solid #f0f0f0' }}>
                    <div className="flex justify-between" style={{ color: '#999' }}>
                      <span>Items subtotal</span>
                      <span>{formatCurrency(ptData?.itemsTotal || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: '#999' }}>
                      <span>Tax share</span>
                      <span>{formatCurrency(ptData?.taxShare || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: '#999' }}>
                      <span>Tip share</span>
                      <span>{formatCurrency(ptData?.tipShare || 0, currency)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Share card */}
      <div className="mt-8 px-5">
        <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>
          Share with the group
        </p>
        <div className="mt-3 flex justify-center">
          <ShareCard
            restaurantName={split.restaurant_name}
            date={split.created_at}
            personTotals={personTotals}
            total={split.total}
            currency={currency}
            honorId={honorId}
          />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <button
            onClick={saveAsImage}
            className="w-full rounded-[12px] py-3 text-[13px] font-medium text-black"
            style={{ background: '#f5f5f5' }}
          >
            📸 Save as image
          </button>
          <button
            onClick={copySummary}
            className="w-full rounded-[12px] py-3 text-[13px] font-medium text-black"
            style={{ background: '#f5f5f5' }}
          >
            {copiedSummary ? 'Copied!' : '📋 Copy summary'}
          </button>
        </div>
      </div>

      {/* Nudge section */}
      <div className="mt-8 px-5">
        <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>
          Collect what you&apos;re owed
        </p>
        <div className="mt-3 space-y-2">
          {personTotals
            .filter((pt) => pt.person.id !== honorId && pt.grandTotal > 0)
            .map((pt) => (
              <div
                key={pt.person.id}
                className="flex items-center justify-between p-3"
                style={{ border: '0.5px solid #f0f0f0', borderRadius: 12 }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                    style={{ backgroundColor: pt.person.color }}
                  >
                    {getInitials(pt.person.name)}
                  </div>
                  <span className="text-sm text-black">{pt.person.name}</span>
                </div>
                <button
                  onClick={() => setNudgePerson(pt.person)}
                  className="rounded-[8px] px-3 py-1.5 text-xs font-medium text-black"
                  style={{ border: '0.5px solid #e0e0e0' }}
                >
                  Remind →
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 px-5">
        <Link
          href="/split/new"
          className="block w-full rounded-[14px] bg-black py-[15px] text-center text-[15px] font-semibold text-white"
        >
          Start a new split →
        </Link>
      </div>

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
