export default function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1 px-5 pt-2 pb-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-[3px] rounded-full transition-all duration-300 ${
            i < step ? 'bg-black' : 'bg-gray-100'
          }`}
        />
      ))}
    </div>
  )
}
