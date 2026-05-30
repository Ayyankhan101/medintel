'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

type BipEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'medintel-install-dismissed-at'
const DISMISS_TTL_MS = 30 * 24 * 60 * 60_000  // 30 days

export function InstallPrompt() {
  const [evt,  setEvt]  = useState<BipEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvt(e as BipEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const onInstalled = () => {
      setShow(false)
      setEvt(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShow(false)
  }

  async function install() {
    if (!evt) return
    try {
      await evt.prompt()
      const choice = await evt.userChoice
      if (choice.outcome === 'accepted') setShow(false)
      else dismiss()
    } catch {
      dismiss()
    }
  }

  if (!show || !evt) return null

  return (
    <div
      role="dialog"
      aria-label="Install MedIntel"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 rounded-2xl border border-slate-200 bg-white shadow-lg p-4 flex items-start gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
        <Download className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">Install MedIntel</p>
        <p className="text-xs text-slate-600 mt-0.5">
          Add to your home screen for one-tap access and offline support.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={install}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-100"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="text-slate-400 hover:text-slate-600 shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  )
}
