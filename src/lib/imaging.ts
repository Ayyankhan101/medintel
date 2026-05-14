/**
 * Imaging triage — vision-LLM analysis of patient-uploaded X-rays,
 * skin photos, eye photos, etc.
 *
 * Hard rule (same as triage): NEVER diagnose. Output is framed as
 * "findings to discuss with a doctor". Final clinical judgement is
 * always the doctor's.
 *
 * Output is Zod-validated and falls back to a conservative stub on any
 * parse failure.
 */

import OpenAI from 'openai'
import { z } from 'zod'

export const ImagingFindings = z.object({
  imageType:    z.enum(['xray', 'skin_photo', 'eye_photo', 'wound', 'rash', 'prescription_photo', 'lab_report', 'other']),
  observations: z.array(z.string().max(280)).max(8),
  redFlags:     z.array(z.string().max(280)).max(6).default([]),
  urgencyHint:  z.enum(['ROUTINE', 'URGENT', 'CRITICAL']),
  suggestedSpecialty: z.string().min(2).max(40),
  caveat:       z.string().max(280).default('AI is assistive only. A doctor must review before any clinical decision.'),
})
export type ImagingFindings = z.infer<typeof ImagingFindings>

let _client: OpenAI | null = null
function client(): OpenAI {
  if (!_client) {
    const useGroq = !!process.env.GROQ_API_KEY
    _client = new OpenAI({
      apiKey:  useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
      baseURL: useGroq ? (process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1') : undefined,
    })
  }
  return _client
}
const VISION_MODEL = process.env.GROQ_API_KEY
  ? 'meta-llama/llama-4-scout-17b-16e-instruct'
  : 'gpt-4o'

const SYSTEM = `You are a triage imaging assistant. The patient has uploaded a medical image.

Hard rules:
- NEVER diagnose. Use language like "appears to show", "consistent with", "consider", "discuss with doctor".
- ONLY describe what is visible in the image. Do not invent metrics that aren't shown.
- Identify the image type, list observations, list red flags (if any), suggest urgency, and pick a specialty.
- Pakistan context: prefer specialties on the canonical list — General Medicine, Cardiology, Pulmonology, Dermatology, Orthopedics, Neurology, Ophthalmology, ENT, Gastroenterology, Endocrinology, Nephrology, Urology, Psychiatry, Gynecology, Pediatrics, Oncology, Emergency Medicine.
- If you cannot interpret the image (blurry, irrelevant, not medical), say so via observations and recommend re-upload. Urgency in that case = ROUTINE, specialty = "General Medicine".
- Output strict JSON only.`

function fallback(): ImagingFindings {
  return {
    imageType:          'other',
    observations:       ['AI could not interpret this image confidently.'],
    redFlags:           [],
    urgencyHint:        'ROUTINE',
    suggestedSpecialty: 'General Medicine',
    caveat:             'AI is assistive only. Please re-upload a clearer image or describe your concern in /intake.',
  }
}

export async function analyzeImage(b64: string, mime: string): Promise<{
  findings:     ImagingFindings
  modelUsed:    string
  usedFallback: boolean
}> {
  try {
    const completion = await client().chat.completions.create({
      model: VISION_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text',      text: 'Analyse this medical image. Return JSON with: imageType, observations, redFlags, urgencyHint, suggestedSpecialty, caveat.' },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
    })
    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = ImagingFindings.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.warn('[imaging] schema parse failed', parsed.error.flatten())
      return { findings: fallback(), modelUsed: VISION_MODEL, usedFallback: true }
    }
    return { findings: parsed.data, modelUsed: VISION_MODEL, usedFallback: false }
  } catch (e) {
    console.error('[imaging] vision call failed', e)
    return { findings: fallback(), modelUsed: VISION_MODEL, usedFallback: true }
  }
}
