export type SeverityLevel = 'ROUTINE' | 'URGENT' | 'CRITICAL'

const CRITICAL_KEYWORDS = [
  'troponin', 'heart attack', 'myocardial infarction', 'crushing chest',
  "can't breathe", 'difficulty breathing', 'stroke', 'unconscious',
  'paralysis', 'anaphylaxis', 'blood pressure 180', 'seizure uncontrolled',
]

const URGENT_KEYWORDS = [
  'severe', 'intense', 'vomiting blood', 'high fever', 'fever 40',
  'unable to walk', 'blurred vision', 'chest pain', 'shortness of breath',
  'confusion', 'disoriented',
]

const MILD_KEYWORDS = [
  'mild', 'slight', 'little', 'minor', 'occasional', 'sometimes',
  'manageable', 'better when resting',
]

const DEPARTMENT_MAP: Array<{ department: string; keywords: string[] }> = [
  { department: 'Cardiology',       keywords: ['chest', 'heart', 'pulse', 'troponin', 'palpitation', 'diaphoresis', 'ecg', 'cardiac'] },
  { department: 'Neurology',        keywords: ['brain', 'numbness', 'seizure', 'migraine', 'stroke', 'confusion', 'dizziness', 'paralysis', 'nerve'] },
  { department: 'Orthopedics',      keywords: ['bone', 'joint', 'fracture', 'knee', 'shoulder', 'spine', 'back pain', 'hip'] },
  { department: 'Gastroenterology', keywords: ['stomach', 'abdomen', 'nausea', 'vomiting', 'diarrhea', 'liver', 'appendix', 'bowel'] },
  { department: 'Pulmonology',      keywords: ['lung', 'breathing', 'shortness of breath', 'cough', 'asthma', 'oxygen', 'sputum'] },
  { department: 'Dermatology',      keywords: ['skin', 'rash', 'itching', 'eczema', 'hives', 'blister'] },
  { department: 'Psychiatry',       keywords: ['anxiety', 'depression', 'mental', 'sleep', 'panic', 'hallucination', 'suicidal'] },
  { department: 'Ophthalmology',    keywords: ['eye', 'vision', 'blurred', 'blind', 'retina'] },
  { department: 'ENT',              keywords: ['ear', 'nose', 'throat', 'hearing', 'sinusitis', 'tonsil'] },
  { department: 'Urology',          keywords: ['kidney', 'bladder', 'urination', 'blood in urine', 'renal'] },
]

export function computeScore(text: string): number {
  const lower = text.toLowerCase()

  if (CRITICAL_KEYWORDS.some(kw => lower.includes(kw))) {
    const matches = CRITICAL_KEYWORDS.filter(kw => lower.includes(kw)).length
    return Math.min(10, 8 + matches)
  }

  if (URGENT_KEYWORDS.some(kw => lower.includes(kw))) {
    const matches = URGENT_KEYWORDS.filter(kw => lower.includes(kw)).length
    return Math.min(7, 5 + Math.floor(matches / 2))
  }

  if (MILD_KEYWORDS.some(kw => lower.includes(kw))) return 2

  return 4
}

export function computeSeverityLevel(score: number): SeverityLevel {
  const clamped = Math.max(1, Math.min(10, score))
  if (clamped <= 4) return 'ROUTINE'
  if (clamped <= 7) return 'URGENT'
  return 'CRITICAL'
}

export function mapDepartment(text: string): string {
  const lower = text.toLowerCase()
  for (const { department, keywords } of DEPARTMENT_MAP) {
    if (keywords.some(kw => lower.includes(kw))) return department
  }
  return 'General Medicine'
}
