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
    keywords: ['anxiety', 'depression', 'mental', 'sleep', 'panic', 'bipolar', 'addiction', 'suicidal', 'stress', 'mood'],
  },
  {
    name: 'Pediatrics',
    description: 'Children under 18 — any complaint where the patient is a child. Vaccinations, growth, childhood infections.',
    keywords: ['child', 'baby', 'infant', 'kid', 'son', 'daughter', 'newborn', 'paediatric', 'pediatric', 'vaccination'],
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
    keywords: ['diabetes', 'sugar', 'thyroid', 'goitre', 'hormone', 'insulin', 'hba1c', 'hypothyroid', 'hyperthyroid'],
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
 *  so 2-char keys like "mi", "bp", "tb" don't accidentally match "mild", "back". */
const KEYWORD_REGEX_CACHE = new Map<string, RegExp>()
function keywordRegex(k: string): RegExp {
  let re = KEYWORD_REGEX_CACHE.get(k)
  if (!re) {
    // Escape regex metacharacters, then bracket with word boundaries.
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    re = new RegExp(`\\b${escaped}\\b`, 'i')
    KEYWORD_REGEX_CACHE.set(k, re)
  }
  return re
}

export function inferSpecialtyFromKeywords(text: string): string {
  let best: { name: string; hits: number } = { name: 'General Medicine', hits: 0 }
  for (const s of SPECIALTIES) {
    if (s.name === 'General Medicine') continue
    const hits = s.keywords.reduce((n, k) => n + (keywordRegex(k).test(text) ? 1 : 0), 0)
    if (hits > best.hits) best = { name: s.name, hits }
  }
  return best.hits > 0 ? best.name : 'General Medicine'
}

/** Human-readable list for prompts. */
export function specialtyPromptList(): string {
  return SPECIALTIES.map(s => `- ${s.name}: ${s.description}`).join('\n')
}
