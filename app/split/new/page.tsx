'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency, saveSplitToHistory } from '@/lib/utils'
import { toast } from '@/components/Toast'
import ProgressBar from '@/components/ProgressBar'
import { ParsedReceipt } from '@/lib/types'

type PageState = 'idle' | 'loading' | 'review' | 'error'

type EditableItem = {
  name: string
  price: number
  editingPrice: boolean
}

export default function NewSplitPage() {
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

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
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("Couldn't read that receipt")
  const [evenSplit, setEvenSplit] = useState(false)
  const [evenSplitCount, setEvenSplitCount] = useState(2)

  const calculatedSubtotal = items.reduce((sum, item) => sum + item.price, 0)
  const calculatedTotal = calculatedSubtotal + tax + tip

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleFileSelect = useCallback(async (file: File) => {
    setState('loading')
    try {
      const buffer = await file.arrayBuffer()
      const base64Image = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )
      const mimeType = file.type

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      let res: Response
      try {
        res = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image, mimeType }),
          signal: controller.signal,
        })
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
          setErrorMessage('That took too long — try again with better lighting')
        } else {
          setErrorMessage('No internet connection — check your signal and try again')
        }
        setState('error')
        return
      }
      clearTimeout(timeoutId)

      if (!res.ok) {
        setErrorMessage("Couldn't read that receipt — try a clearer photo")
        setState('error')
        return
      }

      let receipt: ParsedReceipt
      try {
        receipt = await res.json()
      } catch {
        setErrorMessage("Couldn't read that receipt — try a clearer photo")
        setState('error')
        return
      }

      if ('error' in receipt) {
        setErrorMessage("Couldn't read that receipt — try a clearer photo")
        setState('error')
        return
      }

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
      setErrorMessage("Couldn't read that receipt — try a clearer photo")
      setState('error')
    }
  }, [])

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

  const handleCreateSplit = async () => {
    setIsCreating(true)
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
          evenSplit,
          person_count: evenSplit ? evenSplitCount : undefined,
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
      toast('Split created!')
      router.push(`/s/${data.split_id}`)
    } catch {
      toast('Failed to create split', 'error')
      setIsCreating(false)
    }
  }

  // ─── IDLE ───
  if (state === 'idle') {
    return (
      <main className="flex min-h-screen flex-col bg-white">
        <header className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
          <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: '#f5f5f5' }}>
            <span className="text-sm">←</span>
          </Link>
          <div>
            <p className="text-[16px] font-semibold" style={{ letterSpacing: '-0.3px' }}>Scan receipt</p>
            <p className="text-[11px] text-gray-400">Step 1 of 3</p>
          </div>
        </header>

        <ProgressBar step={1} total={3} />

        <div className="px-5 pt-4 pb-3">
          <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-1">Step 1 of 3</p>
          <h2 className="text-[22px] font-black text-black tracking-tight">Add your receipt</h2>
          <p className="text-[13px] text-gray-400 mt-1">Take a photo or choose from your library</p>
        </div>

        <div className="mx-5 mt-2">
          <div className="overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-white">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors active:bg-gray-50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black text-xl">📷</div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-black">Take a photo</p>
                <p className="mt-0.5 text-xs" style={{ color: '#999' }}>Point at a receipt right now</p>
              </div>
              <span className="text-lg" style={{ color: '#ccc' }}>›</span>
            </button>

            <div className="flex items-center gap-3 px-5">
              <div className="h-px flex-1" style={{ background: '#f0f0f0' }}></div>
              <span className="text-[11px] font-medium" style={{ color: '#ccc' }}>or</span>
              <div className="h-px flex-1" style={{ background: '#f0f0f0' }}></div>
            </div>

            <button
              onClick={() => libraryInputRef.current?.click()}
              className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors active:bg-gray-50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: '#f5f5f5' }}>🖼️</div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-black">Photo library</p>
                <p className="mt-0.5 text-xs" style={{ color: '#999' }}>Pick a saved receipt photo</p>
              </div>
              <span className="text-lg" style={{ color: '#ccc' }}>›</span>
            </button>
          </div>
        </div>

        <div className="mx-5 mt-3 flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
          <span className="text-lg flex-shrink-0">✨</span>
          <div>
            <p className="text-[12px] font-bold text-black">Works with any receipt</p>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Crumpled, dark, blurry, or in a foreign language — our AI handles it all.
            </p>
          </div>
        </div>

        <div className="mt-auto px-5 pb-6 pt-4">
          <button
            onClick={() => router.push('/split/manual')}
            className="w-full py-2 text-center text-[13px]"
            style={{ color: '#999' }}
          >
            Enter items manually instead →
          </button>
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
        <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
      </main>
    )
  }

  // ─── LOADING ───
  if (state === 'loading') {
    return (
      <main className="min-h-screen bg-white">
        <ProgressBar step={1} total={3} />
        <div className="flex flex-col items-center justify-center px-5" style={{ minHeight: 'calc(100vh - 20px)' }}>
        <div className="h-[60px] w-[60px] animate-pulse rounded-full bg-black" />
        <p className="mt-4 text-[16px] font-semibold">Reading your receipt...</p>
        <p className="mt-2 text-[13px]" style={{ color: '#999' }}>This takes about 5 seconds</p>
        </div>
      </main>
    )
  }

  // ─── ERROR ───
  if (state === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5">
        <span className="text-5xl">😵</span>
        <h1 className="mt-4 text-[18px] font-semibold text-black">{errorMessage}</h1>
        <p className="mt-2 text-center text-[13px]" style={{ color: '#999' }}>
          Try again with a different photo or enter items manually.
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
          <button
            onClick={() => setState('idle')}
            className="w-full rounded-[14px] bg-black py-[15px] text-[15px] font-semibold text-white"
          >
            Try again
          </button>
          <button
            onClick={() => router.push('/split/manual')}
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
          <p className="text-[11px] text-gray-400">Step 2 of 3 · Review items</p>
        </div>
      </header>

      <ProgressBar step={2} total={3} />

      <div className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>Items</p>

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
              <button onClick={() => deleteItem(index)} className="shrink-0 text-xs" style={{ color: '#ccc' }}>✕</button>
            </div>
          ))}
        </div>

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

        {/* Even split toggle */}
        <div className="mt-3 flex items-center justify-between rounded-2xl p-4" style={{ background: '#f5f5f5' }}>
          <div>
            <p className="text-sm font-semibold text-black">Split evenly</p>
            <p className="mt-0.5 text-xs" style={{ color: '#999' }}>Skip item assignment</p>
          </div>
          <button
            onClick={() => setEvenSplit(!evenSplit)}
            className="relative rounded-full transition-colors"
            style={{ width: 44, height: 26, background: evenSplit ? '#000' : '#e0e0e0', borderRadius: 13 }}
          >
            <span
              className="absolute top-[3px] left-[3px] block rounded-full bg-white transition-transform"
              style={{ width: 20, height: 20, transform: evenSplit ? 'translateX(18px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {evenSplit && (
          <div className="mt-2 flex items-center justify-between rounded-2xl p-4" style={{ background: '#f5f5f5' }}>
            <p className="text-sm text-black">Number of people</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setEvenSplitCount(Math.max(2, evenSplitCount - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-medium active:scale-95"
                style={{ border: '1px solid #e0e0e0' }}
              >−</button>
              <span className="w-4 text-center text-[16px] font-bold text-black">{evenSplitCount}</span>
              <button
                onClick={() => setEvenSplitCount(Math.min(20, evenSplitCount + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-medium active:scale-95"
                style={{ border: '1px solid #e0e0e0' }}
              >+</button>
            </div>
          </div>
        )}

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
            {formatCurrency(tip, currency)} tip · {formatCurrency(calculatedTotal / (evenSplit ? evenSplitCount : 2), currency)} per person
          </p>
          {evenSplit && (
            <div className="mt-2 pt-2" style={{ borderTop: '0.5px solid #e8e8e8' }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-black">Each person pays</span>
                <span className="text-[16px] font-bold text-black">
                  {formatCurrency(calculatedTotal / evenSplitCount, currency)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-5 pb-8 pt-3">
        <button
          onClick={handleCreateSplit}
          disabled={isCreating || items.length === 0}
          className={`w-full rounded-2xl py-4 text-[15px] font-semibold transition-all ${
            isCreating
              ? 'cursor-not-allowed bg-gray-100 text-gray-400'
              : 'bg-black text-white active:scale-[0.98]'
          }`}
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating your split...
            </span>
          ) : (
            evenSplit
              ? `Split ${formatCurrency(calculatedTotal / evenSplitCount, currency)} each →`
              : 'Looks good → Add people'
          )}
        </button>
      </div>
    </main>
  )
}
