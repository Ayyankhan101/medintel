import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Routes that anyone (even unauthenticated) can hit.
const PUBLIC_PATHS = ['/', '/login', '/register', '/register/doctor']

// Role-scoped prefixes.
const DOCTOR_PREFIXES  = ['/doctor']
const ADMIN_PREFIXES   = ['/admin']
const CLINIC_PREFIXES  = ['/clinic']
const PATIENT_PREFIXES = ['/intake', '/doctors', '/book', '/booking', '/history', '/resources', '/imaging']

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some(p => path === p || path.startsWith(p + '/'))
}

export default auth(req => {
  const { nextUrl } = req
  const path = nextUrl.pathname

  // Skip Next.js internals + static assets up front (matcher already does most of this).
  if (path.startsWith('/_next') || path.startsWith('/api/auth') || path.startsWith('/monitoring')) return NextResponse.next()

  const isLoggedIn = !!req.auth?.user
  const role       = req.auth?.user?.role as 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'CLINIC_ADMIN' | undefined

  // 1. Public routes: if already logged in, push to their home; otherwise let through.
  if (PUBLIC_PATHS.includes(path)) {
    if (isLoggedIn && (path === '/login' || path === '/register')) {
      const dest = role === 'DOCTOR'       ? '/doctor/dashboard'
                 : role === 'ADMIN'        ? '/admin/dashboard'
                 : role === 'CLINIC_ADMIN' ? '/clinic/dashboard'
                 : '/intake'
      return NextResponse.redirect(new URL(dest, nextUrl))
    }
    return NextResponse.next()
  }

  // 2. Anything not public requires a session.
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Role enforcement.
  if (startsWithAny(path, DOCTOR_PREFIXES) && role !== 'DOCTOR' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/intake', nextUrl))
  }
  if (startsWithAny(path, ADMIN_PREFIXES) && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/intake', nextUrl))
  }
  if (startsWithAny(path, CLINIC_PREFIXES) && role !== 'CLINIC_ADMIN' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/intake', nextUrl))
  }
  if (startsWithAny(path, PATIENT_PREFIXES) && role !== 'PATIENT' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/doctor/dashboard', nextUrl))
  }

  // /consultation/[id] is reachable by both roles — the page itself checks ownership.
  return NextResponse.next()
})

export const config = {
  // Run on everything except static assets, public files, and Next.js internals.
  // `api/auth/*` is still routed through (handled inside) so we can read the session.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
