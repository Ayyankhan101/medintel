import OpenAI from 'openai'
import type { TriageResult } from '@/types'

let _openai: OpenAI | null = null
function getClient(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  Cardiology:       ['chest', 'heart', 'pulse', 'troponin', 'palpitation', 'diaphoresis'],
  Neurology:        ['brain', 'numbness', 'seizure', 'headache', 'migraine', 'stroke', 'dizziness', 'confusion'],
  Orthopedics:      ['bone', 'joint', 'fracture', 'back pain', 'knee', 'shoulder'],
  Gastroenterology: ['stomach', 'abdomen', 'nausea', 'vomiting', 'diarrhea', 'liver'],
  Pulmonology:      ['lung', 'breathing', 'shortness of breath', 'asthma', 'wheezing'],
  Dermatology:      ['skin', 'rash', 'itching', 'eczema'],
  Psychiatry:       ['anxiety', 'depression', 'mental', 'sleep', 'panic'],
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
  const emergencyWords = ["crushing", "can't breathe", 'unconscious', 'troponin', 'heart attack', 'stroke']
  const urgentWords    = ['severe', 'intense', 'unable to walk', 'high fever', 'vomiting blood']
  const mildWords      = ['mild', 'slight', 'minor', 'occasional', 'little']

  if (emergencyWords.some(w => lower.includes(w))) return 9
  if (urgentWords.some(w => lower.includes(w)))    return 6
  if (mildWords.some(w => lower.includes(w)))      return 2
  return 4
}

export function buildMedicalSummaryPrompt(transcript: string): string {
  return `You are a clinical AI assistant. Convert the following patient voice transcript into a structured medical summary.

TRANSCRIPT:
"${transcript}"

Respond ONLY with a valid JSON object in this exact format:
{
  "chiefComplaint": "one sentence",
  "symptoms": ["symptom1", "symptom2"],
  "duration": "e.g. 2 days",
  "severity": "mild|moderate|severe",
  "medicalTermSummary": "professional clinical summary in 2-3 sentences",
  "urgencyFlags": ["any red flags like chest pain, breathing difficulty, etc."]
}

Do not include any text outside the JSON object.`
}

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const file = new File([audioBuffer], filename, { type: 'audio/webm' })
  const transcription = await getClient().audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'ur',
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
    model: 'gpt-4o',
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
  const department    = parseDepartmentFromSummary(summaryText + ' ' + transcript)
  const severityScore = parseSeverityFromText(summaryText + ' ' + transcript)

  return { raw, structured, department, severityScore }
}

export async function runFullIntakePipeline(
  audioBuffer: Buffer,
  filename: string
): Promise<TriageResult & { transcript: string; summary: string }> {
  const transcript = await transcribeAudio(audioBuffer, filename)
  const { structured, department, severityScore } = await generateMedicalSummary(transcript)

  const summary = (structured.medicalTermSummary as string) ?? transcript
  const severityLevel =
    severityScore <= 4 ? 'ROUTINE' : severityScore <= 7 ? 'URGENT' : 'CRITICAL'

  return {
    transcript,
    summary,
    department,
    severityScore,
    severityLevel,
    isEmergency: severityScore >= 8,
  }
}

export async function runTextIntakePipeline(
  text: string
): Promise<TriageResult & { transcript: string; summary: string }> {
  const { structured, department, severityScore } = await generateMedicalSummary(text)

  const summary = (structured.medicalTermSummary as string) ?? text
  const severityLevel =
    severityScore <= 4 ? 'ROUTINE' : severityScore <= 7 ? 'URGENT' : 'CRITICAL'

  return {
    transcript: text,
    summary,
    department,
    severityScore,
    severityLevel,
    isEmergency: severityScore >= 8,
  }
}
