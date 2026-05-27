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
    venmo: { label: 'Venmo', emoji: '💚', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    cashapp: { label: 'CashApp', emoji: '💵', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    zelle: { label: 'Zelle', emoji: '💙', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
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
      <div className="flex items-center gap-1">
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
          className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-black outline-none focus:ring-1 focus:ring-gray-300"
        />
        <button
          onClick={handleSave}
          className="rounded-lg bg-black px-2 py-1.5 text-xs text-white"
        >
          Go
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={`flex items-center gap-1 rounded-lg border ${config.border} ${config.bg} px-3 py-1.5 text-xs font-medium ${config.text} transition-colors`}
      >
        <span>{config.emoji}</span>
        <span>{config.label}</span>
      </button>
      {toastVisible && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[10px] text-white">
          Amount copied! Open Zelle and send {formatCurrency(amount)} to {personName}
        </div>
      )}
    </div>
  )
}
