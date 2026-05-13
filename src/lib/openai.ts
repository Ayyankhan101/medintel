import OpenAI from 'openai'
import type { TriageResult } from '@/types'

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) {
    const useGroq = !!process.env.GROQ_API_KEY
    _client = new OpenAI({
      apiKey:  useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
      baseURL: useGroq ? (process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1') : undefined,
    })
  }
  return _client
}

const CHAT_MODEL      = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o'
const WHISPER_MODEL   = process.env.GROQ_API_KEY ? 'whisper-large-v3'        : 'whisper-1'

const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  Cardiology:       ['chest', 'heart', 'pulse', 'troponin', 'palpitation', 'diaphoresis'],
  Neurology:        ['brain', 'numbness', 'seizure', 'headache', 'migraine', 'stroke', 'dizziness', 'confusion'],
  Orthopedics:      ['bone', 'joint', 'fracture', 'back pain', 'knee', 'shoulder'],
  Gastroenterology: ['stomach', 'abdomen', 'nausea', 'vomiting', 'diarrhea', 'liver'],
  Pulmonology:      ['lung', 'breath', 'breathing', 'shortness of breath', 'asthma', 'wheezing', 'respiratory'],
  Dermatology:      ['skin', 'rash', 'itching', 'eczema'],
  Psychiatry:          ['anxiety', 'depression', 'mental', 'sleep', 'panic'],
  'Emergency Medicine': ['emergency', 'life-threatening', 'critical', 'anaphylaxis', 'overdose'],
}

export function parseDepartmentFromSummary(text: string): string {
  const lower = text.toLowerCase()
  for (const [dept, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return dept
  }
  return 'General Medicine'
}

export function parseSeverityFromText(text: string): number {
  const lower = text.toLowerCase()
  const criticalWords = [
    "can't breathe", "cannot breathe", 'not able to breath', 'unable to breath',
    'not breathing', 'crushing chest', 'heart attack', 'cardiac arrest',
    'unconscious', 'unresponsive', 'stroke', 'seizure', 'anaphylaxis',
    'choking', 'overdose', 'not able to speak', 'blacking out', 'passing out',
    'troponin', 'haemorrhage', 'hemorrhage', 'arterial bleeding',
  ]
  const urgentWords = [
    'severe', 'intense', 'unbearable', 'excruciating', 'worst pain',
    'high fever', 'difficulty breathing', 'shortness of breath', 'breathless',
    'vomiting blood', 'unable to walk', 'chest pain', 'chest tightness',
    'rapid heartbeat', 'extreme pain', 'cannot move', 'paralysis',
  ]
  const mildWords = ['mild', 'slight', 'minor', 'occasional', 'little', 'bit of', 'a little']

  if (criticalWords.some(w => lower.includes(w))) return 9
  if (urgentWords.some(w => lower.includes(w)))   return 6
  if (mildWords.some(w => lower.includes(w)))     return 2
  return 4
}

export function buildMedicalSummaryPrompt(transcript: string): string {
  return `You are a clinical AI triage assistant. Analyse the patient transcript and return a structured assessment.

TRANSCRIPT:
"${transcript}"

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "chiefComplaint": "one sentence chief complaint",
  "symptoms": ["symptom1", "symptom2"],
  "duration": "e.g. 2 days, or 'unknown'",
  "medicalTermSummary": "professional clinical summary in 2-3 sentences",
  "urgencyFlags": ["list any red flags — e.g. respiratory distress, chest pain, altered consciousness"],
  "severityScore": <integer 1-10 where 1=trivial, 4=routine, 6=urgent, 9-10=life-threatening>,
  "department": "one of: General Medicine, Cardiology, Neurology, Pulmonology, Gastroenterology, Orthopedics, Dermatology, Psychiatry, Emergency Medicine"
}

Severity scoring guide:
- 1-3: Minor complaints (runny nose, mild rash, slight headache)
- 4-5: Moderate symptoms needing attention soon (fever >38°C, moderate pain)
- 6-7: Urgent — patient should be seen today (high fever, severe pain, vomiting blood)
- 8-10: Emergency — life-threatening (inability to breathe, chest pain, loss of consciousness, stroke signs)

Be conservative: when in doubt, score higher.`
}

export async function transcribeAudio(audioBuffer: Buffer, filename: string, language = 'ur'): Promise<string> {
  // Copy exactly this Buffer's bytes into a fresh ArrayBuffer. Using `audioBuffer.buffer`
  // directly would leak pooled bytes for small audio clips (Buffer.concat returns a slice
  // of an internal 8 KB pool for sizes ≤ ~4 KB).
  const ab = new ArrayBuffer(audioBuffer.byteLength)
  new Uint8Array(ab).set(audioBuffer)
  const file = new File([ab], filename, { type: 'audio/webm' })
  const transcription = await getClient().audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language,
    response_format: 'text',
  })
  return transcription as unknown as string
}

export async function generateMedicalSummary(transcript: string): Promise<{
  raw: string
  structured: Record<string, unknown>
  department: string
  severityScore: number
}> {
  const completion = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: buildMedicalSummaryPrompt(transcript) }],
    temperature: 0.1,
    max_tokens: 500,
  })

  const raw = completion.choices[0].message.content ?? ''
  let structured: Record<string, unknown> = {}
  try {
    structured = JSON.parse(raw)
  } catch {
    structured = { medicalTermSummary: raw }
  }

  const summaryText = (structured.medicalTermSummary as string) ?? transcript

  // Prefer AI-provided values; fall back to keyword heuristics only if missing/invalid
  const aiScore      = typeof structured.severityScore === 'number' ? structured.severityScore : NaN
  const severityScore = Number.isFinite(aiScore) && aiScore >= 1 && aiScore <= 10
    ? Math.round(aiScore)
    : parseSeverityFromText(summaryText + ' ' + transcript)

  const aiDept    = typeof structured.department === 'string' ? structured.department.trim() : ''
  const department = aiDept || parseDepartmentFromSummary(summaryText + ' ' + transcript)

  return { raw, structured, department, severityScore }
}

export async function runFullIntakePipeline(
  audioBuffer: Buffer,
  filename: string,
  language = 'ur',
): Promise<TriageResult & { transcript: string; summary: string }> {
  const transcript = await transcribeAudio(audioBuffer, filename, language)
  const { structured, department, severityScore } = await generateMedicalSummary(transcript)

  const summary       = (structured.medicalTermSummary as string) ?? transcript
  const severityLevel = severityScore <= 4 ? 'ROUTINE' : severityScore <= 7 ? 'URGENT' : 'CRITICAL'

  return { transcript, summary, department, severityScore, severityLevel, isEmergency: severityScore >= 8 }
}

export async function runTextIntakePipeline(
  text: string
): Promise<TriageResult & { transcript: string; summary: string }> {
  const { structured, department, severityScore } = await generateMedicalSummary(text)

  const summary       = (structured.medicalTermSummary as string) ?? text
  const severityLevel = severityScore <= 4 ? 'ROUTINE' : severityScore <= 7 ? 'URGENT' : 'CRITICAL'

  return { transcript: text, summary, department, severityScore, severityLevel, isEmergency: severityScore >= 8 }
}
