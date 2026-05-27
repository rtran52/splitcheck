'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import ProgressBar from '@/components/ProgressBar'
import { toast } from '@/components/Toast'

type ManualItem = {
  id: string
  name: string
  price: string
}

export default function ManualEntryPage() {
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState('')
  const [items, setItems] = useState<ManualItem[]>([
    { id: '1', name: '', price: '' },
    { id: '2', name: '', price: '' },
    { id: '3', name: '', price: '' },
  ])
  const [tax, setTax] = useState('')
  const [tip, setTip] = useState('')
  const [tipPct, setTipPct] = useState<number | null>(20)
  const [isCreating, setIsCreating] = useState(false)

  function addItem() {
    setItems(prev => [...prev, { id: Date.now().toString(), name: '', price: '' }])
  }

  function updateItem(id: string, field: 'name' | 'price', value: string) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const validItems = items.filter(i => i.name.trim() && parseFloat(i.price) > 0)
  const subtotal = validItems.reduce((sum, i) => sum + parseFloat(i.price || '0'), 0)
  const taxAmount = parseFloat(tax || '0')
  const tipAmount = tipPct !== null ? subtotal * (tipPct / 100) : parseFloat(tip || '0')
  const total = subtotal + taxAmount + tipAmount

  async function handleCreate() {
    if (validItems.length === 0 || isCreating) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: restaurantName.trim() || null,
          items: validItems.map(i => ({ name: i.name.trim(), price: parseFloat(i.price) })),
          subtotal,
          tax: taxAmount,
          tip: tipAmount,
          total,
          currency: 'USD',
        }),
      })
      const data = await res.json()
      if (data.split_id) {
        toast('Split created!')
        router.push(`/s/${data.split_id}`)
      }
    } catch {
      toast('Something went wrong', 'error')
      setIsCreating(false)
    }
  }

  return (
    <main className="min-h-screen bg-white max-w-md mx-auto pb-32">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-50">
        <Link href="/split/new" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-[14px]">←</Link>
        <div>
          <p className="text-[15px] font-black text-black">Enter items manually</p>
          <p className="text-[11px] text-gray-400">Step 1 of 3</p>
        </div>
      </div>
      <ProgressBar step={1} total={3} />

      {/* Restaurant name */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-2">Restaurant name (optional)</p>
        <input
          type="text"
          placeholder="e.g. Nobu Downtown"
          value={restaurantName}
          onChange={e => setRestaurantName(e.target.value)}
          className="w-full text-[16px] font-semibold text-black placeholder:text-gray-200 outline-none bg-transparent"
        />
      </div>

      {/* Items */}
      <div className="px-5 pt-4">
        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-3">Items</p>
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
              <input
                type="text"
                placeholder={`Item ${index + 1}`}
                value={item.name}
                onChange={e => updateItem(item.id, 'name', e.target.value)}
                className="flex-1 text-[14px] font-medium text-black placeholder:text-gray-300 outline-none bg-transparent"
              />
              <div className="flex items-center gap-1">
                <span className="text-[13px] text-gray-400">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={item.price}
                  onChange={e => updateItem(item.id, 'price', e.target.value)}
                  className="w-16 text-[14px] font-bold text-black placeholder:text-gray-300 outline-none bg-transparent text-right"
                  inputMode="decimal"
                />
              </div>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="mt-2 w-full flex items-center justify-center gap-2 py-3 text-[13px] font-semibold text-gray-400 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add item
        </button>
      </div>

      {/* Tip */}
      <div className="px-5 pt-5">
        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-3">Tip</p>
        <div className="flex gap-2">
          {[18, 20, 22].map(pct => (
            <button
              key={pct}
              onClick={() => { setTipPct(pct); setTip('') }}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${
                tipPct === pct ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {pct}%
            </button>
          ))}
          <button
            onClick={() => setTipPct(null)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${
              tipPct === null ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Custom
          </button>
        </div>
        {tipPct === null && (
          <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-[13px] text-gray-400">$</span>
            <input
              type="number"
              placeholder="0.00"
              value={tip}
              onChange={e => setTip(e.target.value)}
              className="flex-1 text-[14px] font-bold text-black outline-none bg-transparent"
              inputMode="decimal"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Tax */}
      <div className="px-5 pt-4">
        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-2">Tax</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
          <span className="text-[13px] text-gray-400">$</span>
          <input
            type="number"
            placeholder="0.00"
            value={tax}
            onChange={e => setTax(e.target.value)}
            className="flex-1 text-[14px] font-bold text-black outline-none bg-transparent"
            inputMode="decimal"
          />
        </div>
      </div>

      {/* Totals */}
      <div className="mx-5 mt-4 bg-gray-50 rounded-2xl p-4">
        <div className="flex justify-between py-1">
          <span className="text-[13px] text-gray-400">Subtotal</span>
          <span className="text-[13px] text-black">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-[13px] text-gray-400">Tax</span>
          <span className="text-[13px] text-black">{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-[13px] text-gray-400">Tip {tipPct !== null ? `(${tipPct}%)` : ''}</span>
          <span className="text-[13px] text-black">{formatCurrency(tipAmount)}</span>
        </div>
        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
          <span className="text-[14px] font-black text-black">Total</span>
          <span className="text-[14px] font-black text-black">{formatCurrency(total)}</span>
        </div>
        {validItems.length > 0 && (
          <p className="text-center text-[11px] text-gray-400 mt-2">
            {formatCurrency(total / 2)} per person (2 people) · adjust after adding people
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-5 pb-8 pt-4 bg-white border-t border-gray-50">
        <button
          onClick={handleCreate}
          disabled={validItems.length === 0 || isCreating}
          className={`w-full flex items-center justify-between rounded-2xl px-5 py-4 text-[15px] font-bold transition-all ${
            validItems.length > 0 && !isCreating
              ? 'bg-black text-white active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          <span>{isCreating ? 'Creating split...' : 'Looks good → Add people'}</span>
          {!isCreating && validItems.length > 0 && <span>→</span>}
          {isCreating && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
        </button>
      </div>
    </main>
  )
}
