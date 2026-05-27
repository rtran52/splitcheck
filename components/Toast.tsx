'use client'
import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type ToastMessage = {
  id: string
  message: string
  type: ToastType
}

let toastHandler: ((message: string, type?: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'success') {
  if (toastHandler) toastHandler(message, type)
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    toastHandler = (message, type = 'success') => {
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 2500)
    }
    return () => { toastHandler = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex flex-col items-center gap-2 px-5 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-2xl px-4 py-3 text-[13px] font-semibold shadow-lg transition-all ${
            t.type === 'success' ? 'bg-black text-white' :
            t.type === 'error' ? 'bg-red-500 text-white' :
            'bg-gray-800 text-white'
          }`}
        >
          {t.type === 'success' && '✓  '}{t.message}
        </div>
      ))}
    </div>
  )
}
