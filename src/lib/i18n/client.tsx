/**
 * Client-side locale state. Reads `lang` cookie on mount, exposes a setter
 * that writes the cookie + flips `<html lang>` and `<html dir>` so RTL kicks in.
 *
 * Usage:
 *   const { locale, setLocale, T } = useI18n()
 *   <h1>{T('landing.hero.title')}</h1>
 */
'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { t, type Locale, DEFAULT_LOCALE, type DictKey } from './dict'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

interface I18nCtx {
  locale: Locale
  setLocale: (l: Locale) => void
  T: (key: DictKey | string) => string
}

const Ctx = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const raw = readCookie('lang')
    const next: Locale = raw === 'ur' ? 'ur' : 'en'
    setLocaleState(next)
    applyLocaleToDocument(next)
  }, [])

  function setLocale(next: Locale) {
    setLocaleState(next)
    writeCookie('lang', next)
    applyLocaleToDocument(next)
  }

  const T = (key: DictKey | string) => t(key, locale)

  return <Ctx.Provider value={{ locale, setLocale, T }}>{children}</Ctx.Provider>
}

function applyLocaleToDocument(l: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = l
  document.documentElement.dir  = l === 'ur' ? 'rtl' : 'ltr'
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useI18n must be used inside <I18nProvider>')
  return c
}

/** Drop-in language toggle button. Shows the OTHER language's label. */
export function LangToggle({ className }: { className?: string }) {
  const { locale, setLocale, T } = useI18n()
  return (
    <button type="button" onClick={() => setLocale(locale === 'en' ? 'ur' : 'en')}
            className={className}
            style={{
              background: 'transparent', border: '1px solid rgba(15,23,42,.15)',
              borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600,
              color: 'inherit', cursor: 'pointer',
            }}>
      {T('common.langToggle')}
    </button>
  )
}
