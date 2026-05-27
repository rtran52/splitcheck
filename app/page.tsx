'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const steps = [
  {
    emoji: '📸',
    title: 'Snap your receipt',
    description: 'Point your camera at any receipt. Our AI reads every item instantly.',
  },
  {
    emoji: '👆',
    title: 'Tap who had what',
    description: 'Assign each item to the right person. Split shared dishes too.',
  },
  {
    emoji: '💸',
    title: 'Send payment links',
    description: 'Everyone gets their exact amount with one-tap Venmo and CashApp links.',
  },
]

const features = [
  {
    title: 'No app needed',
    description: 'Friends join via a link. Nothing to download.',
  },
  {
    title: 'AI receipt reading',
    description: 'Works on blurry, crumpled, even foreign receipts.',
  },
  {
    title: 'Birthday mode',
    description: "Honor a guest — their share splits across everyone else.",
  },
  {
    title: 'Debt nudges',
    description: "Forgot to pay? We'll remind them so you don't have to.",
  },
]

export default function HomePage() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_banner_dismissed')
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!dismissed && !isStandalone) {
      setShowBanner(true)
    }
  }, [])

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
        <span className="text-[17px] font-bold" style={{ letterSpacing: '-0.5px' }}>SplitCheck</span>
        <Link href="/history" className="text-xs" style={{ color: '#888' }}>
          Past splits →
        </Link>
      </header>

      {/* Install banner */}
      {showBanner && (
        <div className="mx-5 mt-4 flex items-start justify-between gap-3 rounded-2xl bg-black p-4 text-white">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📲</span>
            <div>
              <p className="text-sm font-semibold">Add to your home screen</p>
              <p className="mt-0.5 text-xs" style={{ color: '#888' }}>
                Tap the share button then &quot;Add to Home Screen&quot; for the best experience
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('pwa_banner_dismissed', 'true')
              setShowBanner(false)
            }}
            className="mt-0.5 flex-shrink-0 text-xl leading-none"
            style={{ color: '#666' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Hero */}
      <section className="px-5 pt-8 pb-6 text-center">
        <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>
          Free · No account needed
        </p>
        <h1 className="mx-auto mt-4 max-w-xs text-[30px] font-bold leading-[1.15]" style={{ letterSpacing: '-0.8px' }}>
          Split any bill{'\n'}in 30 seconds
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed" style={{ color: '#888' }}>
          Snap a receipt. Assign items. Everyone gets a payment link. No app needed.
        </p>
        <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2.5">
          <Link
            href="/split/new"
            className="block w-full rounded-[14px] bg-black py-[15px] text-[15px] font-semibold text-white"
          >
            Scan a receipt →
          </Link>
          <Link
            href="/trip/new"
            className="block w-full rounded-[14px] py-[14px] text-[15px] font-medium text-black"
            style={{ background: '#f5f5f5' }}
          >
            🗺️ Start a trip
          </Link>
        </div>
        <p className="mt-3 text-xs" style={{ color: '#bbb' }}>No account required</p>
      </section>

      {/* How it works */}
      <section className="px-5 py-6">
        <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>
          How it works
        </p>
        <div className="mt-4 space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                style={{ background: '#f5f5f5' }}
              >
                {step.emoji}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-black">{step.title}</p>
                <p className="mt-0.5 text-xs" style={{ color: '#999' }}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-6">
        <p className="text-[11px] font-semibold uppercase" style={{ color: '#bbb', letterSpacing: '0.08em' }}>
          Why SplitCheck
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {features.map((feature, i) => (
            <div key={i} className="rounded-[14px] p-3.5" style={{ background: '#f9f9f9' }}>
              <p className="text-[13px] font-semibold text-black">{feature.title}</p>
              <p className="mt-1 text-xs" style={{ color: '#999' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-5 pb-10 pt-4">
        <Link
          href="/split/new"
          className="block w-full rounded-[14px] bg-black py-[15px] text-center text-[15px] font-semibold text-white"
        >
          Split a bill now →
        </Link>
        <p className="mt-4 text-center text-xs" style={{ color: '#bbb' }}>
          Made with ❤️ for people who hate doing math at the table
        </p>
      </section>
    </main>
  )
}
