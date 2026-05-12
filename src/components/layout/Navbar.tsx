'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Menu, X, Activity, LogOut, User, Stethoscope } from 'lucide-react'

interface NavLink { label: string; href: string }

const PATIENT_LINKS: NavLink[] = [
  { label: 'Consult',   href: '/intake'     },
  { label: 'History',   href: '/history'    },
  { label: 'Resources', href: '/resources'  },
]

const DOCTOR_LINKS: NavLink[] = [
  { label: 'Dashboard', href: '/doctor/dashboard' },
  { label: 'Patients',  href: '/doctor/patients'  },
]

export function Navbar() {
  const pathname = usePathname()
  const [open,  setOpen]  = useState(false)
  const [role,  setRole]  = useState<string | null>(null)
  const [name,  setName]  = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(s => {
        setRole((s?.user as any)?.role ?? null)
        setName((s?.user as any)?.name ?? (s?.user as any)?.email ?? null)
      })
      .catch(() => {})
  }, [pathname])

  const links = role === 'DOCTOR' ? DOCTOR_LINKS : role === 'PATIENT' ? PATIENT_LINKS : []

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-base tracking-tight">MedIntel</span>
        </Link>

        {/* Desktop nav */}
        {links.length > 0 && (
          <nav className="hidden sm:flex items-center gap-1">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(l.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {role ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
                {role === 'DOCTOR'
                  ? <Stethoscope className="w-3.5 h-3.5" />
                  : <User className="w-3.5 h-3.5" />}
                <span className="truncate max-w-[120px]">{name}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Get started
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          {links.length > 0 && (
            <button
              className="sm:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setOpen(o => !o)}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {open && links.length > 0 && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(l.href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
