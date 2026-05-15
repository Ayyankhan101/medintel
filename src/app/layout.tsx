import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Noto_Nastaliq_Urdu } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/ThemeProvider'
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
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
