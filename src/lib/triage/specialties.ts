/**
 * Canonical specialty registry — single source of truth.
 *
 * Used by:
 *  - Doctor signup form (dropdown)
 *  - Triage agent (LLM department selection)
 *  - Keyword-matching fallback when LLM fails
 *  - Refine route (vision agent)
 *
 * `keywords` are used ONLY by the fallback. The LLM is the primary router;
 * its job is conditioned on the `description` field so it knows what each
 * specialty actually treats.
 */

export interface Specialty {
  /** Canonical name — exactly what we store and display. Don't rename casually. */
  name:        string
  /** 1-sentence description fed to the LLM so it picks correctly. */
  description: string
  /** ASCII-lowercase keyword list for the offline fallback. */
  keywords:    string[]
}

export const SPECIALTIES: readonly Specialty[] = [
  {
    name: 'General Medicine',
    description: 'Adult primary care — fevers, infections, minor injuries, routine illness, anything that does not clearly need a specialist.',
    keywords: ['fever', 'cold', 'cough', 'flu', 'general', 'fatigue', 'tired', 'weak'],
  },
  {
    name: 'Cardiology',
    description: 'Heart and major blood vessels — chest pain, palpitations, hypertension, shortness of breath on exertion, prior MI, stent / angiography review.',
    keywords: ['chest', 'heart', 'pulse', 'troponin', 'palpitation', 'diaphoresis', 'angiogram', 'stent', 'mi', 'cardiac', 'hypertension', 'bp', 'blood pressure'],
  },
  {
    name: 'Neurology',
    description: 'Brain, spinal cord, peripheral nerves — headaches, migraines, seizures, stroke, numbness or weakness, vertigo, memory loss.',
    keywords: ['brain', 'numbness', 'seizure', 'headache', 'migraine', 'stroke', 'dizziness', 'confusion', 'tingling', 'tremor', 'memory'],
  },
  {
    name: 'Pulmonology',
    description: 'Lungs and breathing — asthma, COPD, persistent cough, wheezing, TB, sleep apnea, chronic shortness of breath.',
    keywords: ['lung', 'breath', 'breathing', 'shortness of breath', 'asthma', 'wheezing', 'respiratory', 'tb', 'tuberculosis', 'copd'],
  },
  {
    name: 'Gastroenterology',
    description: 'Stomach, intestines, liver, gallbladder — abdominal pain, nausea, vomiting, diarrhea, constipation, GERD, ulcers, hepatitis.',
    keywords: ['stomach', 'abdomen', 'abdominal', 'nausea', 'vomiting', 'diarrhea', 'liver', 'gerd', 'reflux', 'ulcer', 'hepatitis', 'jaundice', 'constipation'],
  },
  {
    name: 'Orthopedics',
    description: 'Bones, joints, muscles — fractures, back pain, knee or shoulder pain, sports injuries, arthritis.',
    keywords: ['bone', 'joint', 'fracture', 'back pain', 'knee', 'shoulder', 'arthritis', 'sprain', 'ligament', 'muscle', 'spine'],
  },
  {
    name: 'Dermatology',
    description: 'Skin, hair, nails — rashes, acne, eczema, psoriasis, hair loss, suspicious moles or lesions.',
    keywords: ['skin', 'rash', 'itching', 'eczema', 'acne', 'psoriasis', 'mole', 'hair loss', 'pimple'],
  },
  {
    name: 'Psychiatry',
    description: 'Mental health — depression, anxiety, panic attacks, sleep disorders, bipolar, addiction.',
    keywords: ['anxiety', 'anxious', 'depression', 'depressed', 'mental', 'sleep', 'insomnia', 'panic', 'bipolar', 'addiction', 'suicidal', 'stress', 'mood'],
  },
  {
    name: 'Pediatrics',
    description: 'Children under 18 — any complaint where the patient is a child. Vaccinations, growth, childhood infections.',
    keywords: ['child', 'children', 'baby', 'infant', 'toddler', 'kid', 'son', 'daughter', 'newborn', 'jaundice', 'paediatric', 'pediatric', 'vaccination', 'months old', 'years old'],
  },
  {
    name: 'Gynecology',
    description: 'Female reproductive health — periods, pregnancy, PCOS, fibroids, menopause, vaginal infections.',
    keywords: ['period', 'menstrual', 'menstruation', 'pregnant', 'pregnancy', 'pcos', 'vaginal', 'ovary', 'uterus', 'menopause', 'gynae'],
  },
  {
    name: 'ENT',
    description: 'Ear, nose, throat — sore throat, earache, hearing loss, sinusitis, tonsillitis, vertigo of inner-ear origin.',
    keywords: ['ear', 'nose', 'throat', 'sinus', 'tonsil', 'hearing', 'sore throat', 'earache', 'sinusitis', 'snoring'],
  },
  {
    name: 'Urology',
    description: 'Urinary tract and male reproductive — UTIs, kidney stones, urinary retention, erectile dysfunction, prostate issues.',
    keywords: ['urine', 'urination', 'uti', 'kidney stone', 'bladder', 'prostate', 'erectile', 'testicle', 'penis', 'urinary'],
  },
  {
    name: 'Ophthalmology',
    description: 'Eyes and vision — blurred vision, eye pain, redness, glaucoma, cataract, diabetic retinopathy.',
    keywords: ['eye', 'vision', 'sight', 'blurred', 'glaucoma', 'cataract', 'retina', 'redness'],
  },
  {
    name: 'Endocrinology',
    description: 'Hormones, diabetes, thyroid — high blood sugar, thyroid issues, weight changes, hormonal imbalance.',
    keywords: ['diabetes', 'diabetic', 'sugar', 'thyroid', 'goitre', 'goiter', 'hormone', 'hormonal', 'insulin', 'hba1c', 'hypothyroid', 'hyperthyroid', 'cold intolerance', 'unexplained weight gain', 'unexplained weight loss'],
  },
  {
    name: 'Nephrology',
    description: 'Kidneys — chronic kidney disease, dialysis, proteinuria, severely abnormal creatinine, kidney failure.',
    keywords: ['kidney failure', 'dialysis', 'creatinine', 'proteinuria', 'ckd', 'nephritis'],
  },
  {
    name: 'Oncology',
    description: 'Cancer — diagnosed malignancy, suspicious mass, post-chemo follow-up, oncology second opinion.',
    keywords: ['cancer', 'tumor', 'tumour', 'malignant', 'chemotherapy', 'chemo', 'oncology', 'lump', 'metastasis'],
  },
  {
    name: 'Emergency Medicine',
    description: 'True emergencies — severe trauma, suspected MI, stroke signs, anaphylaxis, severe bleeding, loss of consciousness. Patient should go to a hospital ER physically, not online.',
    keywords: ['emergency', 'life-threatening', 'unconscious', 'anaphylaxis', 'severe bleeding', 'overdose', 'critical'],
  },
] as const

export const SPECIALTY_NAMES = SPECIALTIES.map(s => s.name) as readonly string[]

/** Validate that a candidate string matches one of our canonical names. */
export function normalizeSpecialty(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  const exact = SPECIALTIES.find(s => s.name.toLowerCase() === trimmed.toLowerCase())
  if (exact) return exact.name
  return null
}

/** Fallback: scan free text for specialty keywords using word-boundary matching
 *  with light suffix tolerance, negation skip, and length-weighted scoring.
 *
 *  Why this is non-trivial:
 *   - "period" should match "periods" → allow trailing -s/-es/-ing/-ed
 *   - "numbness" must NOT match "no numbness" → skip when preceded by negation
 *   - When a long-specific term ("back pain") and a short term ("numbness") tie
 *     on hit count, the longer/more-specific match should win → score by
 *     total matched-character length, not raw hit count
 *   - Vague multi-system complaints route to General Medicine, not the loudest
 *     single keyword. If 3+ specialties match, fall back to General. */
const KEYWORD_REGEX_CACHE = new Map<string, RegExp>()
function keywordRegex(k: string): RegExp {
  let re = KEYWORD_REGEX_CACHE.get(k)
  if (!re) {
    // Escape regex metacharacters, then bracket with word boundaries.
    // Allow plural / -ing / -ed suffixes so "period" matches "periods",
    // "kidney" matches "kidneys", "fail" matches "failing".
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    re = new RegExp(`\\b${escaped}(?:s|es|ing|ed)?\\b`, 'gi')
    KEYWORD_REGEX_CACHE.set(k, re)
  }
  return re
}

const NEGATION_WINDOW = /\b(no|not|without|never|denies|denying|no signs of)\s+(?:\w+\s+){0,2}$/i

/** Returns the matched keyword length, or 0 if no real match (or if negated). */
function scoreKeyword(text: string, keyword: string): number {
  const re = keywordRegex(keyword)
  re.lastIndex = 0
  let total = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(0, m.index)
    if (NEGATION_WINDOW.test(before)) continue
    total += keyword.length
  }
  return total
}

export function inferSpecialtyFromKeywords(text: string): string {
  const scored: { name: string; score: number }[] = []
  for (const s of SPECIALTIES) {
    if (s.name === 'General Medicine') continue
    let score = 0
    for (const k of s.keywords) score += scoreKeyword(text, k)
    if (score > 0) scored.push({ name: s.name, score })
  }
  if (scored.length === 0) return 'General Medicine'
  scored.sort((a, b) => b.score - a.score)

  // 1. Clear winner — top score must dominate (≥ 1.5× the runner-up). Otherwise
  //    the input is ambiguous and the human clinician should triage.
  if (scored.length === 1) return scored[0].name
  if (scored[0].score >= scored[1].score * 1.5) return scored[0].name

  // 2. Multi-system complaint: ≥3 specialties competing on similar ground
  //    → General Medicine handles the initial visit.
  if (scored.length >= 3) return 'General Medicine'

  // 3. Close 2-way tie: pick the longer-match specialty (already sorted by
  //    score which is length-weighted, so this is just the top).
  return scored[0].name
}

/** Human-readable list for prompts. */
export function specialtyPromptList(): string {
  return SPECIALTIES.map(s => `- ${s.name}: ${s.description}`).join('\n')
}
