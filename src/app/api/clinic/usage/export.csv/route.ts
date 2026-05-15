/**
 * GET /api/clinic/usage/export.csv — same data as /breakdown, served as CSV
 * with Content-Disposition so the browser downloads it. Useful for clinic
 * payroll / accounting reconciliation.
 */
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const LOOKBACK_DAYS = 30

function csvEscape(v: string | number | null): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLINIC_ADMIN')
    return new Response('Forbidden', { status: 403 })

  const clinic = await prisma.clinic.findUnique({
    where:  { ownerUserId: session.user.id },
    select: { id: true, slug: true },
  })
  if (!clinic) return new Response('No clinic linked', { status: 404 })

  const since   = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60_000)
  const doctors = await prisma.doctor.findMany({
    where:   { clinicId: clinic.id },
    include: {
      user: { select: { name: true, email: true } },
      appointments: {
        where:  { createdAt: { gte: since } },
        select: { status: true, cancelledBy: true, escrow: { select: { status: true, amount: true, refundedAmount: true } } },
      },
    },
    orderBy: { user: { name: 'asc' } },
  })

  const header = ['Doctor', 'Email', 'Specialty', 'Rating', 'Reviews', 'Completed', 'Cancelled', 'Refunded', 'No-shows', 'Revenue (PKR)']
  const lines: string[] = [header.join(',')]

  for (const d of doctors) {
    let completed = 0, cancelled = 0, noShow = 0, refunded = 0, revenue = 0
    for (const a of d.appointments) {
      if (a.status === 'COMPLETED') completed++
      else if (a.status === 'CANCELLED') cancelled++
      else if (a.status === 'REFUNDED') refunded++
      if (a.cancelledBy === 'SYSTEM') noShow++
      if (a.escrow?.status === 'RELEASED') {
        const r = a.escrow.refundedAmount ? Number(a.escrow.refundedAmount) : 0
        revenue += Math.floor((Number(a.escrow.amount) - r) * 0.9)
      }
    }
    lines.push([
      csvEscape(d.user.name),
      csvEscape(d.user.email),
      csvEscape(d.specialization),
      csvEscape(d.rating ? Number(d.rating).toFixed(2) : ''),
      csvEscape(d.reviewCount),
      csvEscape(completed),
      csvEscape(cancelled),
      csvEscape(refunded),
      csvEscape(noShow),
      csvEscape(revenue),
    ].join(','))
  }

  const filename = `medintel-${clinic.slug}-doctors-${new Date().toISOString().slice(0, 10)}.csv`
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
