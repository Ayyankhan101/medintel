import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Activity, Building2, MessageSquareText, PhoneCall, ShieldCheck, Star, Clock, ArrowRight, Stethoscope } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'

interface PageProps { params: Promise<{ slug: string }> }

async function loadClinic(slug: string) {
  return prisma.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      brandColor: true,
      active: true,
      whatsappNumber: true,
      voiceNumber: true,
      doctors: {
        where:  { kydStatus: 'VERIFIED' },
        select: {
          id: true,
          specialization: true,
          consultationFee: true,
          yearsExperience: true,
          rating: true,
          reviewCount: true,
          trustBadge: true,
          bio: true,
          qualifications: true,
          user: { select: { name: true } },
        },
        orderBy: [{ trustBadge: 'desc' }, { rating: 'desc' }, { reviewCount: 'desc' }],
        take: 50,
      },
    },
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const clinic = await loadClinic(slug)
  if (!clinic || !clinic.active) return { title: 'Clinic not found — MedIntel' }
  return {
    title:       `${clinic.name} — MedIntel`,
    description: `Book a verified doctor at ${clinic.name}. Voice triage in Urdu, Pashto, Punjabi, Sindhi, or English. Escrow-protected payments.`,
    openGraph: {
      title:       clinic.name,
      description: `Verified doctors at ${clinic.name} on MedIntel`,
      type:        'website',
    },
  }
}

export default async function ClinicPublicPage({ params }: PageProps) {
  const { slug } = await params
  const clinic = await loadClinic(slug)
  if (!clinic || !clinic.active) notFound()

  const brand = clinic.brandColor && /^#[0-9a-fA-F]{6}$/.test(clinic.brandColor)
    ? clinic.brandColor
    : '#2563eb'

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">MedIntel</span>
          </Link>
          <Link
            href="/intake"
            className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg hover:opacity-90"
            style={{ background: brand }}
          >
            Start consultation
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="px-5 py-16 text-white"
        style={{ background: `linear-gradient(135deg, ${brand}, ${brand}cc)` }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold border border-white/20">
            <Building2 className="w-3.5 h-3.5" /> Verified MedIntel partner
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">{clinic.name}</h1>
          <p className="mt-3 max-w-xl text-white/90 text-base leading-relaxed">
            Voice-first telemedicine. Describe your symptoms, get matched with a verified doctor,
            pay in escrow.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={`/intake?clinic=${encodeURIComponent(clinic.slug)}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-semibold hover:opacity-90"
            >
              Start consultation <ArrowRight className="w-4 h-4" />
            </Link>
            {clinic.whatsappNumber && (
              <a
                href={`https://wa.me/${clinic.whatsappNumber.replace(/[^0-9]/g, '')}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 font-medium hover:bg-white/25"
              >
                <MessageSquareText className="w-4 h-4" /> WhatsApp triage
              </a>
            )}
            {clinic.voiceNumber && (
              <a
                href={`tel:${clinic.voiceNumber}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 font-medium hover:bg-white/25"
              >
                <PhoneCall className="w-4 h-4" /> {clinic.voiceNumber}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section className="px-5 py-12 flex-1">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Doctors</p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {clinic.doctors.length === 0 ? 'Roster coming soon' : `${clinic.doctors.length} verified specialist${clinic.doctors.length === 1 ? '' : 's'}`}
              </h2>
            </div>
          </div>

          {clinic.doctors.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
              <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No doctors listed yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinic.doctors.map(d => {
                const rating = d.rating ? Number(d.rating).toFixed(1) : null
                return (
                  <Link
                    key={d.id}
                    href={`/doctors/${d.id}`}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-md hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{d.user.name ?? 'Doctor'}</h3>
                        <p className="text-xs text-slate-500">{d.specialization}</p>
                      </div>
                      {d.trustBadge && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                          <ShieldCheck className="w-2.5 h-2.5" /> KYD
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {rating ? (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">{rating}</span>
                          {d.reviewCount > 0 && <span className="text-slate-400">({d.reviewCount})</span>}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">New</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {d.yearsExperience} yrs
                      </span>
                    </div>

                    {d.bio && <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">{d.bio}</p>}

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        PKR {Number(d.consultationFee).toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-blue-600">View profile →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-800 py-6 px-5 text-center text-xs text-slate-400">
        Powered by <Link href="/" className="font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600">MedIntel</Link> · NADRA + PMDC verified
      </footer>
    </div>
  )
}
