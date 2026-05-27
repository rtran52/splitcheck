'use client'

import { useState, useEffect } from 'react'

export default function InstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if dismissed
    if (localStorage.getItem('splitcheck_dismiss_install')) return
    // Only show on mobile
    const ua = navigator.userAgent
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua)
    if (!mobile) return

    setIsIOS(/iPhone|iPad|iPod/i.test(ua))
    setShow(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem('splitcheck_dismiss_install', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="mx-6 mt-2 flex items-start gap-3 rounded-xl bg-gray-50 p-4">
      <span className="text-lg">📲</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-black">
          Add SplitCheck to your home screen
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {isIOS
            ? 'Tap the Share button then "Add to Home Screen"'
            : 'Tap the menu then "Add to Home Screen"'}
        </p>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-sm text-gray-400 transition-colors hover:text-black"
      >
        ✕
      </button>
    </div>
  )
}
