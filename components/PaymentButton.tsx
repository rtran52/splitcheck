'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

type PaymentType = 'venmo' | 'cashapp' | 'zelle'

export default function PaymentButton({
  type,
  personName,
  amount,
  restaurantName,
  handle,
  onSaveHandle,
}: {
  type: PaymentType
  personName: string
  amount: number
  restaurantName: string | null
  handle: string | null
  onSaveHandle: (handle: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const config = {
    venmo: { label: 'Venmo', bg: '#008CFF' },
    cashapp: { label: 'Cash App', bg: '#00D632' },
    zelle: { label: 'Zelle', bg: '#6B1DD9' },
  }[type]

  const note = encodeURIComponent(`SplitCheck - ${restaurantName || 'Dinner'}`)

  const openPayment = (username: string) => {
    if (type === 'venmo') {
      window.open(`venmo://paycharge?txn=pay&recipients=${username}&amount=${amount}&note=${note}`, '_blank')
    } else if (type === 'cashapp') {
      window.open(`https://cash.app/$${username}/${amount}`, '_blank')
    }
  }

  const handleClick = () => {
    if (type === 'zelle') {
      navigator.clipboard.writeText(amount.toFixed(2))
      setToastVisible(true)
      setTimeout(() => setToastVisible(false), 2500)
      return
    }
    if (handle) {
      openPayment(handle)
    } else {
      setEditing(true)
    }
  }

  const handleSave = () => {
    const trimmed = inputValue.trim().replace(/^[@$]/, '')
    if (!trimmed) return
    onSaveHandle(trimmed)
    setEditing(false)
    openPayment(trimmed)
  }

  if (editing) {
    return (
      <div className="flex flex-1 items-center gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder={type === 'venmo' ? '@username' : '$cashtag'}
          autoFocus
          className="w-full rounded-[8px] px-2 py-1.5 text-xs text-black"
          style={{ background: '#f5f5f5' }}
        />
        <button onClick={handleSave} className="rounded-[8px] bg-black px-2 py-1.5 text-xs text-white">Go</button>
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      <button
        onClick={handleClick}
        className="w-full rounded-[10px] border-0 py-[9px] text-xs font-semibold text-white"
        style={{ background: config.bg }}
      >
        {config.label}
      </button>
      {toastVisible && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black px-2.5 py-1 text-[10px] text-white">
          Copied! Send {formatCurrency(amount)} to {personName}
        </div>
      )}
    </div>
  )
}
