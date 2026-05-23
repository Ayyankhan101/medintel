'use client'
import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => { /* non-fatal */ })
    }

    // Data-saver mode — mark <html data-save> so CSS can strip heavy assets
    if (navigator.connection?.saveData) {
      document.documentElement.dataset.save = 'true'
    }
  }, [])
  return null
}
