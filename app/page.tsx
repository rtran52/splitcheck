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
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-black">SplitCheck</h1>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            Free
          </span>
        </div>
        <Link href="/history" className="text-sm text-gray-400 transition-colors hover:text-black">
          View past splits →
        </Link>
      </header>

      {/* Hero */}
      <section className="px-6 py-12 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
          Split any bill in 30 seconds
        </h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-gray-500">
          Snap a receipt. Assign items. Everyone gets a payment link. No app needed.
        </p>
        <Link
          href="/split/new"
          className="mt-8 inline-block rounded-full bg-black px-8 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-80"
        >
          Scan a Receipt →
        </Link>
        <p className="mt-3 text-sm text-gray-400">No account required</p>
      </section>

      {/* How it works */}
      <section className="px-6 py-12">
        <h3 className="mb-8 text-center text-2xl font-bold text-black">How it works</h3>
        <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl">{step.emoji}</div>
              <h4 className="mt-3 text-lg font-semibold text-black">{step.title}</h4>
              <p className="mt-1 text-sm text-gray-500">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-12">
        <h3 className="mb-8 text-center text-2xl font-bold text-black">Why SplitCheck</h3>
        <div className="mx-auto grid max-w-lg gap-4 sm:max-w-2xl sm:grid-cols-2">
          {features.map((feature, i) => (
            <div key={i} className="rounded-xl bg-gray-50 p-5">
              <h4 className="font-semibold text-black">{feature.title}</h4>
              <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-16 text-center">
        <Link
          href="/split/new"
          className="inline-block rounded-full bg-black px-8 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-80"
        >
          Split a bill now →
        </Link>
        <p className="mt-4 text-sm text-gray-400">
          Made with ❤️ for people who hate doing math at the table
        </p>
      </section>
    </main>
  )
}
