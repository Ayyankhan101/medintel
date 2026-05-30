import type { TriageResult } from '@/types'
import { runTriageAgent } from './triage/agent'
import { WHISPER_MODEL, getLlmClient } from './llm-client'

export async function transcribeAudio(audioBuffer: Buffer, filename: string, language = 'ur'): Promise<string> {
  // Copy exactly this Buffer's bytes into a fresh ArrayBuffer. Using `audioBuffer.buffer`
  // directly would leak pooled bytes for small audio clips (Buffer.concat returns a slice
  // of an internal 8 KB pool for sizes ≤ ~4 KB).
  const ab = new ArrayBuffer(audioBuffer.byteLength)
  new Uint8Array(ab).set(audioBuffer)
  const file = new File([ab], filename, { type: 'audio/webm' })
  const transcription = await getLlmClient().audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language,
    response_format: 'text',
  })
  // response_format: 'text' returns a raw string. Guard so we never persist
  // `[object Object]` if the SDK ever swaps to a wrapped payload.
  if (typeof transcription === 'string') return transcription
  const text = (transcription as { text?: unknown } | null)?.text
  if (typeof text === 'string') return text
  throw new Error('Whisper transcription returned non-string payload')
}

export async function runFullIntakePipeline(
  audioBuffer: Buffer,
  filename: string,
  language = 'ur',
): Promise<TriageResult & { transcript: string; summary: string }> {
  const transcript = await transcribeAudio(audioBuffer, filename, language)
  const { output } = await runTriageAgent(transcript)
  return {
    transcript,
    summary:       output.medicalTermSummary,
    department:    output.specialty,
    severityScore: output.severityScore,
    severityLevel: output.severityLevel,
    isEmergency:   output.severityScore >= 8,
  }
}

export async function runTextIntakePipeline(
  text: string,
): Promise<TriageResult & { transcript: string; summary: string }> {
  const { output } = await runTriageAgent(text)
  return {
    transcript:    text,
    summary:       output.medicalTermSummary,
    department:    output.specialty,
    severityScore: output.severityScore,
    severityLevel: output.severityLevel,
    isEmergency:   output.severityScore >= 8,
  }
}
