import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { SeverityLevel } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseDepartmentFromSummary, parseSeverityFromText } from '@/lib/openai'
import { normalizeSpecialty, SPECIALTY_NAMES } from '@/lib/triage/specialties'

const MAX_BYTES = 8 * 1024 * 1024  // 8 MB per image
const MAX_FILES = 3

function getClient(): OpenAI {
  const useGroq = !!process.env.GROQ_API_KEY
  return new OpenAI({
    apiKey:  useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
    baseURL: useGroq ? (process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1') : undefined,
  })
}

const VISION_MODEL = process.env.GROQ_API_KEY
  ? 'meta-llama/llama-4-scout-17b-16e-instruct'
  : 'gpt-4o'

function buildPrompt(originalTranscript: string, originalSummary: string): string {
  return `You are a clinical triage assistant analysing patient-uploaded medical documents (lab reports, imaging, prescriptions, doctor notes, symptom photos).

ORIGINAL COMPLAINT:
"${originalTranscript}"

ORIGINAL AI SUMMARY:
"${originalSummary}"

Task: read every uploaded image. Identify the document type (lab report, imaging report, ECG, prescription, photo of symptom, etc.). Extract concrete clinical metrics where present. Decide if findings change the triage severity and the recommended specialty.

Return ONLY valid JSON in this exact shape (no markdown, no commentary):
{
  "documentTypes": ["lab_report" | "imaging_report" | "ecg" | "prescription" | "discharge_note" | "symptom_photo" | "other", …],
  "keyFindings": [
    {
      "metric": "short label, e.g. 'LAD blockage', 'HbA1c', 'Hemoglobin', 'Blood pressure', 'Ejection fraction'",
      "value":  "as written, e.g. '70%', '9.1%', '8.4 g/dL', '160/100 mmHg', '40%'",
      "interpretation": "1-line clinical meaning, e.g. 'severe stenosis — likely intervention needed', 'poorly controlled diabetes', 'moderate anaemia'",
      "isAbnormal": true
    }
  ],
  "suggestedInterventions": [
    "concrete next steps a clinician might order, e.g. 'angiography with PCI consideration', '1-2 drug-eluting stents likely', 'iron supplementation', 'urgent cardiology referral'"
  ],
  "extractedFindings": "2-4 sentence plain-language summary of what the documents show",
  "updatedSummary": "professional clinical summary combining original complaint + new findings, 3-5 sentences",
  "urgencyFlags": ["any new red flags surfaced by these documents"],
  "severityScore": <integer 1-10>,
  "department": "one of: ${SPECIALTY_NAMES.join(', ')}"
}

Scoring guide:
- 1-3: Minor
- 4-5: Moderate, see a doctor soon
- 6-7: Urgent, today
- 8-10: Emergency / hospital admission

Extraction rules:
- Always report numeric values exactly as written in the document.
- If you see imaging mentioning stenosis or blockage with a percentage, list it under keyFindings with metric = the vessel name (e.g. "LAD", "RCA", "Carotid") and value = the percentage.
- For ECG: capture rate, rhythm, and any flagged abnormality (ST elevation, ischaemia, etc.).
- For lab panels: capture the OUT-OF-RANGE values only, not normal ones.
- For prescriptions: list each medication name + dose under keyFindings (metric = drug, value = dose).
- suggestedInterventions must be specific (drug names, procedure names, referral specialty). Avoid vague advice.
- Be conservative on severity — when in doubt, score higher.
- Empty arrays are valid for keyFindings / suggestedInterventions / urgencyFlags if nothing relevant is present.`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const triage = await prisma.triage.findUnique({
    where:   { id },
    include: { patient: { include: { user: true } } },
  })
  if (!triage) return NextResponse.json({ error: 'Triage not found' }, { status: 404 })
  if (triage.patient.user.id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse multipart form with up to MAX_FILES image uploads.
  const images: { mime: string; b64: string }[] = []
  try {
    const form = await req.formData()
    const files = form.getAll('docs').filter((f): f is File => f instanceof File)
    if (files.length === 0) return NextResponse.json({ error: 'No documents uploaded' }, { status: 400 })
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Up to ${MAX_FILES} documents at a time` }, { status: 400 })

    for (const f of files) {
      if (f.size > MAX_BYTES) return NextResponse.json({ error: `${f.name} is larger than ${MAX_BYTES / 1024 / 1024} MB` }, { status: 413 })
      const mime = f.type || 'image/jpeg'
      if (!mime.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image uploads are supported (JPG, PNG, WEBP). Convert PDFs to images first.' }, { status: 415 })
      }
      const buf = Buffer.from(await f.arrayBuffer())
      images.push({ mime, b64: buf.toString('base64') })
    }
  } catch (e) {
    console.error('[triage/refine] form parse error:', e)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Call Groq vision with the prior context + every uploaded image inline.
  let raw = ''
  try {
    const completion = await getClient().chat.completions.create({
      model:       VISION_MODEL,
      temperature: 0.1,
      max_tokens:  700,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: buildPrompt(triage.transcript, triage.summary) },
          ...images.map(img => ({
            type:      'image_url' as const,
            image_url: { url: `data:${img.mime};base64,${img.b64}` },
          })),
        ],
      }],
    })
    raw = completion.choices[0]?.message?.content ?? ''
  } catch (e) {
    console.error('[triage/refine] AI error:', e)
    return NextResponse.json({ error: 'Document analysis failed' }, { status: 502 })
  }

  let structured: Record<string, unknown> = {}
  try {
    // Some models wrap JSON in markdown fences — strip if present.
    const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    structured = JSON.parse(cleaned)
  } catch {
    structured = { updatedSummary: raw }
  }

  const aiScore = typeof structured.severityScore === 'number' ? structured.severityScore : NaN
  const severityScore = Number.isFinite(aiScore) && aiScore >= 1 && aiScore <= 10
    ? Math.round(aiScore)
    : parseSeverityFromText(`${triage.transcript} ${(structured.updatedSummary as string) ?? ''}`)

  const severityLevel: SeverityLevel = severityScore <= 4 ? 'ROUTINE'
                                     : severityScore <= 7 ? 'URGENT'
                                     : 'CRITICAL'

  const aiDeptRaw = typeof structured.department === 'string' ? structured.department.trim() : ''
  const department = normalizeSpecialty(aiDeptRaw)
                  ?? parseDepartmentFromSummary(triage.transcript + ' ' + ((structured.updatedSummary as string) ?? ''))

  const updatedSummary = (structured.updatedSummary as string) ?? triage.summary
  const findings = (structured.extractedFindings as string) ?? ''

  const updated = await prisma.triage.update({
    where: { id: triage.id },
    data: {
      summary:       findings ? `${updatedSummary}\n\nDocument findings: ${findings}` : updatedSummary,
      severityScore,
      severityLevel,
      department,
    },
  })

  return NextResponse.json({
    triageId:               updated.id,
    transcript:             updated.transcript,
    summary:                updated.summary,
    department:             updated.department,
    severityScore:          updated.severityScore,
    severityLevel:          updated.severityLevel,
    extractedFindings:      findings,
    keyFindings:            Array.isArray(structured.keyFindings)            ? structured.keyFindings            : [],
    suggestedInterventions: Array.isArray(structured.suggestedInterventions) ? structured.suggestedInterventions : [],
    documentTypes:          Array.isArray(structured.documentTypes)          ? structured.documentTypes          : [],
    isEmergency:            severityScore >= 8,
  })
}
