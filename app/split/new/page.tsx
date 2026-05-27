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
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, price: parseFloat(value) || 0 } : item))
  }

  const updateItemName = (index: number, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, name: value } : item)))
  }

  const deleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleEditPrice = (index: number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, editingPrice: !item.editingPrice } : item))
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
      <main className="min-h-screen bg-white">
        <header className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: '#f5f5f5' }}>
              <span className="text-sm">←</span>
            </Link>
            <div>
              <p className="text-[16px] font-semibold" style={{ letterSpacing: '-0.3px' }}>Scan receipt</p>
              <p className="text-xs" style={{ color: '#999' }}>Photo or upload</p>
            </div>
          </div>
          <Link href="/history" className="text-xs" style={{ color: '#888' }}>Past splits →</Link>
        </header>

        <div className="px-5 pt-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex h-[220px] cursor-pointer flex-col items-center justify-center rounded-[20px]"
            style={{ border: '1.5px dashed #e0e0e0', background: '#fafafa' }}
          >
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-black text-2xl">
              📷
            </div>
            <p className="mt-3 text-[15px] font-semibold text-black">Take a photo</p>
            <p className="mt-1 text-xs" style={{ color: '#bbb' }}>or drag and drop</p>
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

          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {['Crumpled receipts', 'Foreign receipts', 'Dark photos'].map((label) => (
              <span
                key={label}
                className="rounded-[20px] px-2.5 py-1 text-[11px]"
                style={{ background: '#f5f5f5', color: '#888' }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => alert('Coming soon!')} className="text-xs underline" style={{ color: '#bbb' }}>
              Enter items manually instead →
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ─── LOADING ───
  if (state === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5">
        <div className="h-[60px] w-[60px] animate-pulse rounded-full bg-black" />
        <p className="mt-4 text-[16px] font-semibold">Reading your receipt...</p>
        <p className="mt-2 text-[13px]" style={{ color: '#999' }}>This takes about 5 seconds</p>
      </main>
    )
  }

  // ─── ERROR ───
  if (state === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5">
        <span className="text-5xl">😵</span>
        <h1 className="mt-4 text-[18px] font-semibold">Couldn&apos;t read that receipt</h1>
        <p className="mt-2 text-center text-[13px]" style={{ color: '#999' }}>
          The image might be too blurry or dark. Try again with better lighting.
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
          <button
            onClick={() => setState('idle')}
            className="w-full rounded-[14px] bg-black py-[15px] text-[15px] font-semibold text-white"
          >
            Try again
          </button>
          <button
            onClick={() => alert('Coming soon!')}
            className="w-full rounded-[14px] py-[14px] text-[15px] font-medium text-black"
            style={{ background: '#f5f5f5' }}
          >
            Enter manually
          </button>
        </div>
      </main>
    )
  }

  // ─── REVIEW ───
  return (
    <main className="min-h-screen bg-white pb-28">
      <header className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
        <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: '#f5f5f5' }}>
          <span className="text-sm">←</span>
        </Link>
        <div>
          <p className="text-[16px] font-semibold" style={{ letterSpacing: '-0.3px' }}>Review receipt</p>
          <p className="text-xs" style={{ color: '#999' }}>{restaurantName || 'Your receipt'}</p>
        </div>
      </header>

      <div className="px-5 pt-5">
        {/* Items label */}
        <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>Items</p>

        {/* Items list */}
        <div className="mt-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 py-3" style={{ borderBottom: '0.5px solid #f5f5f5' }}>
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItemName(index, e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-black"
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
                  className="w-20 rounded-lg px-2 py-1 text-right text-sm font-bold text-black"
                  style={{ background: '#f5f5f5' }}
                />
              ) : (
                <button onClick={() => toggleEditPrice(index)} className="shrink-0 text-sm font-bold text-black">
                  {formatCurrency(item.price, currency)}
                </button>
              )}
              <button
                onClick={() => deleteItem(index)}
                className="shrink-0 text-xs"
                style={{ color: '#ccc' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add item */}
        <button onClick={addItem} className="flex w-full items-center gap-2 py-3 text-sm" style={{ color: '#888' }}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs" style={{ background: '#f5f5f5' }}>+</span>
          Add item
        </button>

        {/* Tip */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>Tip</p>
          <div className="mt-2 flex gap-2">
            {[18, 20, 22].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  setTipPercent(pct)
                  setCustomTip(false)
                  setTip(Math.round(calculatedSubtotal * (pct / 100) * 100) / 100)
                }}
                className="flex-1 rounded-[10px] py-2 text-[13px] font-medium transition-colors"
                style={
                  tipPercent === pct && !customTip
                    ? { background: '#000', color: '#fff' }
                    : { background: '#f5f5f5', color: '#666' }
                }
              >
                {pct}%
              </button>
            ))}
            <button
              onClick={() => { setCustomTip(true); setTipPercent(null) }}
              className="flex-1 rounded-[10px] py-2 text-[13px] font-medium transition-colors"
              style={customTip ? { background: '#000', color: '#fff' } : { background: '#f5f5f5', color: '#666' }}
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
              className="mt-2 w-full rounded-[10px] px-3 py-2.5 text-sm text-black"
              style={{ background: '#f5f5f5' }}
            />
          )}
        </div>

        {/* Totals box */}
        <div className="mt-3 rounded-[14px] p-3.5" style={{ background: '#f9f9f9' }}>
          <div className="flex justify-between py-1.5 text-sm">
            <span style={{ color: '#888' }}>Subtotal</span>
            <span className="text-black">{formatCurrency(calculatedSubtotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span style={{ color: '#888' }}>Tax</span>
            {editingTax ? (
              <input
                type="number"
                step="0.01"
                value={tax || ''}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                onBlur={() => setEditingTax(false)}
                autoFocus
                className="w-20 rounded-lg bg-white px-2 py-1 text-right text-sm text-black"
              />
            ) : (
              <button onClick={() => setEditingTax(true)} className="text-sm text-black">
                {formatCurrency(tax, currency)}
              </button>
            )}
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span style={{ color: '#888' }}>Tip</span>
            <span className="text-black">{formatCurrency(tip, currency)}</span>
          </div>
          <div className="mt-1 pt-2" style={{ borderTop: '0.5px solid #e8e8e8' }}>
            <div className="flex justify-between text-[15px]">
              <span className="font-bold text-black">Total</span>
              <span className="font-bold text-black">{formatCurrency(calculatedTotal, currency)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs" style={{ color: '#bbb' }}>
            {formatCurrency(tip, currency)} tip · {formatCurrency(calculatedTotal / 2, currency)} per person
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-5 pb-8 pt-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || items.length === 0}
          className="w-full rounded-[14px] bg-black py-[15px] text-[15px] font-semibold text-white disabled:opacity-[0.35]"
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
