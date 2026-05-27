import { PersonTotal } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

export default function ShareCard({
  restaurantName,
  date,
  personTotals,
  total,
  currency,
  honorId,
}: {
  restaurantName: string | null
  date: string
  personTotals: PersonTotal[]
  total: number
  currency: string
  honorId: string | null
}) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      id="share-card"
      className="w-[340px] rounded-2xl bg-white p-6 shadow-lg"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-black">SplitCheck</span>
        <span className="text-xs text-gray-400">{formattedDate}</span>
      </div>

      {/* Restaurant name */}
      <h2 className="mt-3 text-xl font-bold text-black">
        {restaurantName || 'Dinner'}
      </h2>

      {/* Divider */}
      <div className="my-4 h-px bg-gray-100" />

      {/* People */}
      <div className="space-y-3">
        {personTotals.map((pt) => {
          const isHonored = honorId === pt.person.id
          return (
            <div key={pt.person.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: pt.person.color }}
                />
                <span className="text-sm text-black">{pt.person.name}</span>
              </div>
              {isHonored ? (
                <span className="text-sm">🎂 on us</span>
              ) : (
                <span className="text-sm font-semibold text-black">
                  {formatCurrency(pt.grandTotal, currency)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-gray-100" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-black">Total</span>
        <span className="text-sm font-bold text-black">
          {formatCurrency(total, currency)}
        </span>
      </div>

      {/* Footer */}
      <p className="mt-5 text-center text-[10px] text-gray-300">
        Split fairly with SplitCheck
      </p>
    </div>
  )
}
