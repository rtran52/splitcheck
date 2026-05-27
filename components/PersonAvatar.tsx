export default function PersonAvatar({
  name,
  color,
  size = 'md',
  showCrown = false,
}: {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  showCrown?: boolean
}) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' }
  return (
    <div className="relative inline-flex flex-col items-center">
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white`}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {showCrown && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm">👑</span>
      )}
    </div>
  )
}
