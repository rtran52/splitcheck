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
      className="w-[340px] bg-white p-6"
      style={{ borderRadius: 14, border: '0.5px solid #f0f0f0' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-black">SplitCheck</span>
        <span className="text-[11px]" style={{ color: '#bbb' }}>{formattedDate}</span>
      </div>

      <h2 className="mt-3 text-[15px] font-bold text-black" style={{ letterSpacing: '-0.3px' }}>
        {restaurantName || 'Dinner'}
      </h2>

      <div className="my-4" style={{ height: '0.5px', background: '#f0f0f0' }} />

      <div className="space-y-2.5">
        {personTotals.map((pt) => {
          const isHonored = honorId === pt.person.id
          return (
            <div key={pt.person.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: pt.person.color }} />
                <span className="text-[13px] text-black">{pt.person.name}</span>
              </div>
              {isHonored ? (
                <span className="text-[13px]">🎂 on us</span>
              ) : (
                <span className="text-[13px] font-semibold text-black">
                  {formatCurrency(pt.grandTotal, currency)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="my-4" style={{ height: '0.5px', background: '#f0f0f0' }} />

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-black">Total</span>
        <span className="text-[13px] font-bold text-black">{formatCurrency(total, currency)}</span>
      </div>

      <p className="mt-5 text-center text-[10px]" style={{ color: '#ccc' }}>
        Split fairly with SplitCheck
      </p>
    </div>
  )
}
