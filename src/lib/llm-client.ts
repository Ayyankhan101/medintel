/**
 * Single OpenAI/Groq client + model constants.
 * Groq is used when GROQ_API_KEY is set (free tier, OpenAI-compatible),
 * otherwise the call falls back to OpenAI.
 */
import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getLlmClient(): OpenAI {
  if (_client) return _client
  const useGroq = !!process.env.GROQ_API_KEY
  _client = new OpenAI({
    apiKey:  useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
    baseURL: useGroq ? (process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1') : undefined,
  })
  return _client
}

export const CHAT_MODEL    = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o'
export const WHISPER_MODEL = process.env.GROQ_API_KEY ? 'whisper-large-v3'        : 'whisper-1'
export const VISION_MODEL  = process.env.GROQ_API_KEY ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'gpt-4o'
export const SCRIBE_MODEL  = CHAT_MODEL
