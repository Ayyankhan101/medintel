import { Star, ShieldCheck, Clock, ArrowRight } from 'lucide-react'

interface Doctor {
  id: string
  specialization: string
  consultationFee: string | number
  yearsExperience: number
  rating: string | number | null
  reviewCount: number
  trustBadge: boolean
  bio: string | null
  user: { email: string }
}

interface Props { doctor: Doctor; onBook: (id: string) => void }

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const colors   = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700']
  const color    = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {initials}
    </div>
  )
}

export function DoctorCard({ doctor, onBook }: Props) {
  const rating = doctor.rating ? Number(doctor.rating).toFixed(1) : null

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition-all group">
      <div className="flex items-start gap-4">
        <Avatar name={doctor.specialization} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-900">{doctor.specialization}</h3>
                {doctor.trustBadge && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                    <ShieldCheck className="w-3 h-3" /> KYD Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {rating && (
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-slate-700">{rating}</span>
                    {doctor.reviewCount > 0 && <span className="text-slate-400">({doctor.reviewCount})</span>}
                  </span>
                )}
                {!rating && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">New</span>}
                <span className="flex items-center gap-1 text-sm text-slate-400">
                  <Clock className="w-3 h-3" />
                  {doctor.yearsExperience} yrs
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-slate-900">PKR {Number(doctor.consultationFee).toLocaleString()}</p>
              <p className="text-xs text-slate-400">per session</p>
            </div>
          </div>
          {doctor.bio && (
            <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">{doctor.bio}</p>
          )}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-xs text-slate-400">{doctor.user.email}</p>
        <button
          onClick={() => onBook(doctor.id)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors group-hover:shadow-md"
        >
          Book now <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
