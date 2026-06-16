import type { TriageResult } from '@/types'
import { runTriageAgent, type PatientContext } from './triage/agent'
import { WHISPER_MODEL, getLlmClient } from './llm-client'

const CONFIDENCE_FLOOR = 0.7

export async function transcribeAudio(audioBuffer: Buffer, filename: string, language = 'ur'): Promise<string> {
  const ab = new ArrayBuffer(audioBuffer.byteLength)
  new Uint8Array(ab).set(audioBuffer)
  const file = new File([ab], filename, { type: 'audio/webm' })
  const transcription = await getLlmClient().audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language,
    response_format: 'text',
  })
  if (typeof transcription === 'string') return transcription
  const text = (transcription as { text?: unknown } | null)?.text
  if (typeof text === 'string') return text
  throw new Error('Whisper transcription returned non-string payload')
}

export async function transcribeAudioWithConfidence(audioBuffer: Buffer, filename: string, language = 'ur'): Promise<{ text: string; confidence: number }> {
  const ab = new ArrayBuffer(audioBuffer.byteLength)
  new Uint8Array(ab).set(audioBuffer)
  const file = new File([ab], filename, { type: 'audio/webm' })
  const transcription = await getLlmClient().audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language,
    response_format: 'json',
  })
  const data = transcription as { text?: string; segments?: { confidence?: number }[] }
  const text = typeof data?.text === 'string' ? data.text : ''
  if (!text) throw new Error('Whisper transcription returned empty text')

  const segments = data.segments ?? []
  const avgConfidence = segments.length > 0
    ? segments.reduce((sum, s) => sum + (s.confidence ?? 0.5), 0) / segments.length
    : 0.5

  return { text, confidence: avgConfidence }
}

export async function runFullIntakePipeline(
  audioBuffer: Buffer,
  filename: string,
  language = 'ur',
  context?: PatientContext,
): Promise<TriageResult & { transcript: string; summary: string; confidence: number }> {
  const { text: transcript, confidence } = await transcribeAudioWithConfidence(audioBuffer, filename, language)

  if (confidence < CONFIDENCE_FLOOR) {
    console.warn(`[openai] transcription confidence ${confidence.toFixed(2)} below floor ${CONFIDENCE_FLOOR} — proceeding with caveat`)
  }

  const { output, rawOutput } = await runTriageAgent(transcript, context)
  return {
    transcript,
    summary:       output.medicalTermSummary,
    department:    output.specialty,
    severityScore: output.severityScore,
    severityLevel: output.severityLevel,
    isEmergency:   output.severityScore >= 8,
    confidence,
    rawOutput:     rawOutput as unknown as Record<string, unknown>,
  }
}

export async function runTextIntakePipeline(
  text: string,
  context?: PatientContext,
): Promise<TriageResult & { transcript: string; summary: string; confidence: number }> {
  const { output, rawOutput } = await runTriageAgent(text, context)
  return {
    transcript:    text,
    summary:       output.medicalTermSummary,
    department:    output.specialty,
    severityScore: output.severityScore,
    severityLevel: output.severityLevel,
    isEmergency:   output.severityScore >= 8,
    confidence:    output.confidence,
    rawOutput:     rawOutput as unknown as Record<string, unknown>,
  }
}
