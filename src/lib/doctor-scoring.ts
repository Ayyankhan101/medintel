/**
 * Doctor scoring — pure scoring function extracted from the API route
 * so it can be unit-tested independently.
 */

export interface DoctorForScoring {
  languages: string[]
  tier: string
  rating: number | null
  reviewCount: number
}

export interface ScoreParams {
  doctor: DoctorForScoring
  language?: string | null
  severity?: number | null
}

export function computeDoctorScore({ doctor, language, severity }: ScoreParams): number {
  let score = 1.0

  if (language && doctor.languages?.length > 0) {
    const langs = doctor.languages.map(l => l.toLowerCase())
    if (langs.includes(language.toLowerCase())) {
      score *= 1.5
    }
  }

  if (severity !== null && severity !== undefined && severity >= 7 && doctor.tier === 'SENIOR') {
    score *= 1.3
  }

  const rating = doctor.rating ?? 0
  if (rating > 0) {
    score *= 1 + (rating / 5) * 0.1
  }

  if (doctor.reviewCount >= 50) score *= 1.05
  else if (doctor.reviewCount >= 10) score *= 1.02

  return Math.round(score * 100) / 100
}
