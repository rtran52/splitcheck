'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency, saveSplitToHistory } from '@/lib/utils'
import { ParsedReceipt } from '@/lib/types'

type PageState = 'idle' | 'loading' | 'review' | 'error'

type EditableItem = {
  name: string
  price: number
  editingPrice: boolean
}

export default function NewSplitPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<PageState>('idle')
  const [items, setItems] = useState<EditableItem[]>([])
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [, setSubtotal] = useState(0)
  const [tax, setTax] = useState(0)
  const [tip, setTip] = useState(0)
  const [currency, setCurrency] = useState('USD')
  const [editingTax, setEditingTax] = useState(false)
  const [tipPercent, setTipPercent] = useState<number | null>(20)
  const [customTip, setCustomTip] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const calculatedSubtotal = items.reduce((sum, item) => sum + item.price, 0)
  const calculatedTotal = calculatedSubtotal + tax + tip

  const handleFileSelect = useCallback(async (file: File) => {
    setState('loading')

    try {
      const buffer = await file.arrayBuffer()
      const base64Image = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )
      const mimeType = file.type

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image, mimeType }),
      })

      if (!res.ok) throw new Error('Failed to scan receipt')

      const receipt: ParsedReceipt = await res.json()
      if ('error' in receipt) throw new Error(String(receipt.error))

      setRestaurantName(receipt.restaurant_name)
      setItems(receipt.items.map((item) => ({ ...item, editingPrice: false })))
      setSubtotal(receipt.subtotal)
      setTax(receipt.tax)
      setCurrency(receipt.currency)
      // Auto-select 20% tip
      const sub = receipt.items.reduce((sum: number, item: { price: number }) => sum + item.price, 0)
      setTip(Math.round(sub * 0.2 * 100) / 100)
      setTipPercent(20)
      setCustomTip(false)
      setState('review')
    } catch {
      setState('error')
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const updateItemPrice = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, price: parseFloat(value) || 0 } : item
      )
    )
  }

  const updateItemName = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, name: value } : item))
    )
  }

  const deleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleEditPrice = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, editingPrice: !item.editingPrice } : item
      )
    )
  }

  const addItem = () => {
    setItems((prev) => [...prev, { name: '', price: 0, editingPrice: true }])
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: restaurantName,
          items: items.map((item) => ({ name: item.name, price: item.price })),
          subtotal: calculatedSubtotal,
          tax,
          tip,
          total: calculatedTotal,
          currency,
        }),
      })

      if (!res.ok) throw new Error('Failed to create split')

      const data = await res.json()
      saveSplitToHistory({
        id: data.split_id,
        share_code: data.share_code,
        restaurant_name: restaurantName,
        total: calculatedTotal,
        currency: currency,
        created_at: new Date().toISOString(),
        person_count: 0,
      })

      // If part of a trip, link the split to the trip
      const pendingTripId = localStorage.getItem('pending_trip_id')
      if (pendingTripId) {
        try {
          await fetch(`/api/trips/${pendingTripId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add_split', split_id: data.split_id }),
          })
        } catch { /* best effort */ }
        localStorage.removeItem('pending_trip_id')
      }

      router.push(`/s/${data.split_id}`)
    } catch {
      alert('Failed to create split. Please try again.')
      setSubmitting(false)
    }
  }

  // ─── IDLE ───
  if (state === 'idle') {
    return (
      <main className="min-h-screen bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl">←</Link>
          <Link href="/history" className="text-sm text-gray-400 transition-colors hover:text-black">
            Past splits →
          </Link>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-black">Scan your receipt</h1>
          <p className="mt-1 text-gray-500">Take a photo or upload an image</p>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="mt-8 flex h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 transition-colors hover:border-gray-400"
        >
          <span className="text-5xl">📷</span>
          <p className="mt-4 font-semibold text-black">Tap to take a photo</p>
          <p className="mt-1 text-sm text-gray-400">or drag and drop an image</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
        />

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {['Crumpled receipts', 'Foreign receipts', 'Dark photos'].map((label) => (
            <span
              key={label}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => alert('Coming soon!')}
            className="text-sm text-gray-400 underline"
          >
            Enter items manually instead →
          </button>
        </div>
      </main>
    )
  }

  // ─── LOADING ───
  if (state === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="h-16 w-16 animate-pulse rounded-full bg-black" />
        <p className="mt-6 text-xl font-bold text-black">Reading your receipt...</p>
        <p className="mt-2 text-sm text-gray-400">This takes about 5 seconds</p>
      </main>
    )
  }

  // ─── ERROR ───
  if (state === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <h1 className="text-2xl font-bold text-black">Couldn&apos;t read that receipt</h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          The image might be too blurry or dark. Try again with better lighting.
        </p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => setState('idle')}
            className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white"
          >
            Try again
          </button>
          <button
            onClick={() => alert('Coming soon!')}
            className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-black"
          >
            Enter manually
          </button>
        </div>
      </main>
    )
  }

  // ─── REVIEW ───
  return (
    <main className="min-h-screen bg-white px-6 py-5 pb-32">
      <Link href="/" className="inline-block text-2xl">
        ←
      </Link>

      <div className="mt-6">
        <h1 className="text-2xl font-bold text-black">Does this look right?</h1>
        <p className="mt-1 text-gray-500">{restaurantName || 'Your receipt'}</p>
      </div>

      {/* Items list */}
      <div className="mt-6 divide-y divide-gray-100">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 py-3">
            <button
              onClick={() => deleteItem(index)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              ✕
            </button>
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItemName(index, e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-black outline-none"
              placeholder="Item name"
            />
            {item.editingPrice ? (
              <input
                type="number"
                step="0.01"
                value={item.price || ''}
                onChange={(e) => updateItemPrice(index, e.target.value)}
                onBlur={() => toggleEditPrice(index)}
                autoFocus
                className="w-20 rounded bg-gray-50 px-2 py-1 text-right text-black outline-none ring-1 ring-gray-200"
              />
            ) : (
              <button
                onClick={() => toggleEditPrice(index)}
                className="shrink-0 text-black"
              >
                {formatCurrency(item.price, currency)}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add item */}
      <button
        onClick={addItem}
        className="mt-2 flex w-full items-center gap-2 py-3 text-sm text-gray-400 transition-colors hover:text-black"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs">
          +
        </span>
        Add item
      </button>

      {/* Summary */}
      <div className="mt-6 space-y-3 border-t border-gray-100 pt-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="text-black">{formatCurrency(calculatedSubtotal, currency)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Tax</span>
          {editingTax ? (
            <input
              type="number"
              step="0.01"
              value={tax || ''}
              onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
              onBlur={() => setEditingTax(false)}
              autoFocus
              className="w-20 rounded bg-gray-50 px-2 py-1 text-right text-black outline-none ring-1 ring-gray-200"
            />
          ) : (
            <button onClick={() => setEditingTax(true)} className="text-black">
              {formatCurrency(tax, currency)}
            </button>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Tip</span>
            <span className="text-black">{formatCurrency(tip, currency)}</span>
          </div>
          <div className="mt-2 flex gap-2">
            {[18, 20, 22].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  setTipPercent(pct)
                  setCustomTip(false)
                  setTip(Math.round(calculatedSubtotal * (pct / 100) * 100) / 100)
                }}
                className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
                  tipPercent === pct && !customTip
                    ? 'bg-black text-white'
                    : 'border border-gray-200 text-black'
                }`}
              >
                {pct}%
              </button>
            ))}
            <button
              onClick={() => {
                setCustomTip(true)
                setTipPercent(null)
              }}
              className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
                customTip
                  ? 'bg-black text-white'
                  : 'border border-gray-200 text-black'
              }`}
            >
              Custom
            </button>
          </div>
          {customTip && (
            <input
              type="number"
              step="0.01"
              value={tip || ''}
              onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
              autoFocus
              placeholder="Enter tip amount"
              className="mt-2 w-full rounded-lg bg-gray-50 px-3 py-2 text-sm text-black outline-none ring-1 ring-gray-200"
            />
          )}
          <p className="mt-2 text-xs text-gray-400">
            {formatCurrency(tip, currency)} tip &bull; {formatCurrency(calculatedTotal / 2, currency)} per person
          </p>
        </div>

        <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-semibold">
          <span className="text-black">Total</span>
          <span className="text-black">{formatCurrency(calculatedTotal, currency)}</span>
        </div>
      </div>

      {/* Submit button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-6">
        <button
          onClick={handleSubmit}
          disabled={submitting || items.length === 0}
          className="w-full rounded-full bg-black py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </span>
          ) : (
            'Looks good → Add people'
          )}
        </button>
      </div>
    </main>
  )
}
