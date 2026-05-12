import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Star, ShieldCheck } from 'lucide-react'

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

interface Props {
  doctor: Doctor
  onBook: (doctorId: string) => void
}

export function DoctorCard({ doctor, onBook }: Props) {
  const rating = doctor.rating ? Number(doctor.rating).toFixed(1) : 'New'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{doctor.specialization}</span>
              {doctor.trustBadge && (
                <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  KYD Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {rating}
                {doctor.reviewCount > 0 && ` (${doctor.reviewCount} reviews)`}
              </span>
              <span>{doctor.yearsExperience} yrs exp</span>
            </div>
            {doctor.bio && (
              <p className="text-sm text-gray-600 line-clamp-2">{doctor.bio}</p>
            )}
          </div>
          <div className="text-right space-y-2 shrink-0">
            <div className="font-bold text-gray-900">PKR {doctor.consultationFee}</div>
            <Button size="sm" onClick={() => onBook(doctor.id)}>
              Book
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
