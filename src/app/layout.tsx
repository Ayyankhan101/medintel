import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Noto_Nastaliq_Urdu } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/ThemeProvider'
import { I18nProvider } from '@/lib/i18n/client'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import './globals.css'

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})
const urdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  variable: '--font-urdu',
  display: 'swap',
  weight: ['400', '600'],
})

export const metadata: Metadata = {
  title: 'MedIntel — Voice-First Healthcare',
  description: 'AI-powered online consultations for Pakistan. Speak in Urdu or English.',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MedIntel',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${urdu.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full font-sans"
        style={{ background: 'var(--bg)', color: 'var(--ink)', backgroundImage: 'var(--gradient-stage)' }}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white focus:text-sm focus:font-medium focus:outline-none">
          Skip to main content
        </a>
        <ThemeProvider><I18nProvider>{children}</I18nProvider></ThemeProvider>
        <Analytics />
        <ServiceWorkerRegistration />
        <InstallPrompt />
      </body>
    </html>
  )
}
