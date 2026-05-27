'use client'

import { useState } from 'react'
import { Person } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

type Tone = 'gentle' | 'petty' | 'formal'

const MESSAGES: Record<Tone, string[]> = {
  gentle: [
    'Hey {name}! Just a heads up — you owe {amount} from {restaurant}. No rush, just whenever you get a chance 😊',
    'Hey {name} 👋 SplitCheck says you owe {amount} from {restaurant}. Venmo me when you can!',
    'Friendly reminder that {name} owes {amount} from {restaurant}. You\'re the best 💛',
  ],
  petty: [
    'Hey {name}, just checking — did your wallet fall in the toilet? You owe {amount} from {restaurant} 😅',
    'Not to be that person but... {name} you owe {amount} from {restaurant}. I\'ve been refreshing Venmo 👀',
    'Sooo {name}... {restaurant} called and they said you still owe {amount} lmaooo 💀',
  ],
  formal: [
    'Hi {name}, this is a reminder that {amount} is outstanding from {restaurant}. Please remit at your earliest convenience.',
    'Dear {name}, your balance of {amount} from {restaurant} remains unpaid. Kindly settle when possible.',
    'Payment reminder: {name} owes {amount} from {restaurant}. Thank you for your prompt attention to this matter.',
  ],
}

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function NudgeModal({
  person,
  amount,
  restaurantName,
  currency,
  onClose,
}: {
  person: Person
  amount: number
  restaurantName: string | null
  currency?: string
  onClose: () => void
}) {
  const [tone, setTone] = useState<Tone | null>(null)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const restaurant = restaurantName || 'dinner'
  const amountStr = formatCurrency(amount, currency)

  const selectTone = (t: Tone) => {
    setTone(t)
    const template = pickRandom(MESSAGES[t])
    setMessage(
      template
        .replace(/{name}/g, person.name)
        .replace(/{amount}/g, amountStr)
        .replace(/{restaurant}/g, restaurant)
    )
    setCopied(false)
  }

  const copyMessage = () => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openIMessage = () => {
    window.open(`sms:&body=${encodeURIComponent(message)}`, '_self')
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white px-6 pb-8 pt-5 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold text-black">Remind {person.name}</h2>
        <p className="mt-1 text-sm text-gray-500">Choose a vibe:</p>

        {/* Tone buttons */}
        <div className="mt-4 flex gap-2">
          {([
            { key: 'gentle' as Tone, emoji: '👻', label: 'Gentle' },
            { key: 'petty' as Tone, emoji: '😅', label: 'Petty' },
            { key: 'formal' as Tone, emoji: '📊', label: 'Formal' },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => selectTone(t.key)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                tone === t.key
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-gray-50 text-black hover:bg-gray-100'
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              <br />
              {t.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {tone && (
          <div className="mt-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-black outline-none focus:ring-1 focus:ring-gray-300"
            />

            <div className="mt-3 flex gap-2">
              <button
                onClick={copyMessage}
                className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-50"
              >
                {copied ? 'Copied!' : '📋 Copy message'}
              </button>
              <button
                onClick={openIMessage}
                className="flex-1 rounded-full bg-black py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80"
              >
                💬 Open iMessage
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
