'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <main className="min-h-screen bg-white max-w-md mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-black rounded-full" />
          <span className="text-[17px] font-black text-black tracking-tight">SplitCheck</span>
        </div>
        <Link href="/history" className="text-[12px] text-gray-400 font-medium">
          History →
        </Link>
      </div>

      {/* Hero */}
      <div className="px-5 pt-6 pb-5">
        <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5 mb-4">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <span className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">Free · No account needed</span>
        </div>

        <h1 className="text-[32px] font-black text-black leading-[1.05] tracking-[-1px] mb-3">
          Split any bill<br />in seconds.
        </h1>

        <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
          Snap a receipt. AI reads every item. Everyone gets a payment link. No app needed.
        </p>

        <Link
          href="/split/new"
          className="flex items-center justify-between w-full bg-black text-white rounded-2xl px-5 py-4 text-[15px] font-bold mb-3 active:scale-[0.98] transition-transform"
        >
          <span>Scan a receipt</span>
          <span className="text-lg">→</span>
        </Link>

        <Link
          href="/trip/new"
          className="flex items-center justify-center w-full bg-gray-50 text-black rounded-2xl px-5 py-4 text-[14px] font-semibold mb-3 active:scale-[0.98] transition-transform"
        >
          🗺️ Start a trip
        </Link>

        <p className="text-center text-[11px] text-gray-300">
          No signup · No account · Free forever
        </p>
      </div>

      {/* How it works */}
      <div className="px-5 pb-6">
        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-3">How it works</p>
        <div className="flex flex-col gap-2">
          {[
            { n: '1', title: 'Snap your receipt', sub: 'AI reads every item instantly' },
            { n: '2', title: 'Tap who had what', sub: 'Assign items, split shared dishes' },
            { n: '3', title: 'Send payment links', sub: 'One-tap Venmo and CashApp' },
          ].map(s => (
            <div key={s.n} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
              <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center text-white text-[12px] font-black flex-shrink-0">
                {s.n}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-black">{s.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div className="px-5 pb-6">
        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-3">Why SplitCheck</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: '🔗', title: 'No app needed', desc: 'Friends join via a link. Nothing to download.' },
            { icon: '🤖', title: 'AI powered', desc: 'Works on blurry, crumpled, foreign receipts.' },
            { icon: '🎂', title: 'Birthday mode', desc: 'Honor a guest — their share splits across everyone.' },
            { icon: '💬', title: 'Debt nudges', desc: 'Remind friends so you don\'t have to.' },
          ].map(f => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-4">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="text-[12px] font-bold text-black">{f.title}</p>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-10">
        <Link
          href="/split/new"
          className="flex items-center justify-between w-full bg-black text-white rounded-2xl px-5 py-4 text-[15px] font-bold active:scale-[0.98] transition-transform mb-3"
        >
          <span>Split a bill now</span>
          <span className="text-lg">→</span>
        </Link>
        <p className="text-center text-[11px] text-gray-300">
          Made with ❤️ for people who hate doing math at the table
        </p>
      </div>

    </main>
  )
}
