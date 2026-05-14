/**
 * Triage agent eval harness.
 *
 * Runs each case in evals/triage/cases.jsonl through runTriageAgent, scores
 * against expected severity band + acceptable specialty list, and prints a
 * report. Exits 1 if pass rate falls below EVAL_PASS_THRESHOLD (default 0.85)
 * — wire that into CI to catch regressions before they ship.
 *
 * Usage:
 *   GROQ_API_KEY=sk_... npx tsx evals/triage/run.ts
 *   EVAL_CONCURRENCY=3 EVAL_PASS_THRESHOLD=0.9 npx tsx evals/triage/run.ts
 *   npx tsx evals/triage/run.ts --filter crit-     # only run cases whose id contains "crit-"
 *
 * Scoring:
 *   • Severity   — actual within [minSeverity, maxSeverity]
 *   • Specialty  — actual ∈ acceptable list
 *   • Emergency  — when expected.isEmergency is set, actual must match
 *   A case passes only if all applicable checks pass.
 *
 * Critical-miss is tracked separately and printed loud — any expected
 * isEmergency=true case that came back non-emergency is a P0 regression.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local if present (so the harness picks up GROQ_API_KEY for ad-hoc
// runs). Production CI should set env vars directly. Must run BEFORE the
// agent module is imported so its OpenAI client picks up the key.
function loadEnvLocal() {
  const envPath = resolve(__dirname, '..', '..', '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
loadEnvLocal()

// Dynamic import after env is loaded so the lazy OpenAI client sees the key.
type AgentMod = typeof import('../../src/lib/triage/agent.ts')
let agentMod: AgentMod | null = null
async function runTriageAgent(input: string) {
  if (!agentMod) agentMod = await import('../../src/lib/triage/agent.ts')
  return agentMod.runTriageAgent(input)
}

interface Expect {
  minSeverity: number
  maxSeverity: number
  specialties: string[]
  isEmergency?: boolean
}
interface Case {
  id: string
  input: string
  expect: Expect
  notes?: string
}

interface CaseResult {
  id: string
  input: string
  expect: Expect
  actual: {
    severity: number
    specialty: string
    isEmergency: boolean
    source: string
    latencyMs: number
  }
  pass: boolean
  failures: string[]
  criticalMiss: boolean
}

function loadCases(): Case[] {
  const path = resolve(__dirname, 'cases.jsonl')
  const text = readFileSync(path, 'utf8')
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map((line, i) => {
      try {
        return JSON.parse(line) as Case
      } catch (e) {
        throw new Error(`cases.jsonl line ${i + 1}: ${(e as Error).message}`)
      }
    })
}

async function runOne(c: Case): Promise<CaseResult> {
  const t0 = Date.now()
  let actual = {
    severity: 0,
    specialty: '',
    isEmergency: false,
    source: 'error',
    latencyMs: 0,
  }
  const failures: string[] = []
  try {
    const r = await runTriageAgent(c.input)
    actual = {
      severity:    r.output.severityScore,
      specialty:   r.output.specialty,
      isEmergency: r.isEmergency,
      source:      r.source,
      latencyMs:   Date.now() - t0,
    }
  } catch (e) {
    failures.push(`THREW: ${(e as Error).message}`)
    return { id: c.id, input: c.input, expect: c.expect, actual: { ...actual, latencyMs: Date.now() - t0 }, pass: false, failures, criticalMiss: !!c.expect.isEmergency }
  }

  if (actual.severity < c.expect.minSeverity || actual.severity > c.expect.maxSeverity) {
    failures.push(`severity ${actual.severity} outside [${c.expect.minSeverity}, ${c.expect.maxSeverity}]`)
  }
  if (!c.expect.specialties.includes(actual.specialty)) {
    failures.push(`specialty '${actual.specialty}' not in acceptable [${c.expect.specialties.join(', ')}]`)
  }
  if (c.expect.isEmergency !== undefined && actual.isEmergency !== c.expect.isEmergency) {
    failures.push(`isEmergency ${actual.isEmergency} expected ${c.expect.isEmergency}`)
  }
  const criticalMiss = c.expect.isEmergency === true && !actual.isEmergency
  return { id: c.id, input: c.input, expect: c.expect, actual, pass: failures.length === 0, failures, criticalMiss }
}

async function runChunked<T, R>(items: T[], n: number, fn: (it: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += n) {
    const batch = items.slice(i, i + n)
    const results = await Promise.all(batch.map(fn))
    out.push(...results)
    process.stdout.write('.')
  }
  process.stdout.write('\n')
  return out
}

function color(c: 'red' | 'green' | 'yellow' | 'cyan' | 'gray' | 'reset', s: string): string {
  const codes = { red: 31, green: 32, yellow: 33, cyan: 36, gray: 90, reset: 0 }
  return process.stdout.isTTY ? `\x1b[${codes[c]}m${s}\x1b[0m` : s
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)
}

function report(results: CaseResult[]) {
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  const critMisses = results.filter(r => r.criticalMiss)
  const passRate = pass / results.length

  console.log('\n' + '─'.repeat(80))
  console.log(color('cyan', 'TRIAGE EVAL'))
  console.log('─'.repeat(80))

  // Per-case table
  console.log(
    pad('ID', 28) + pad('SEV', 8) + pad('SPECIALTY', 22) + pad('SRC', 11) + pad('MS', 7) + 'STATUS',
  )
  console.log('─'.repeat(80))
  for (const r of results) {
    const sevStr = `${r.actual.severity}/${r.expect.minSeverity}-${r.expect.maxSeverity}`
    const status = r.criticalMiss
      ? color('red', '✕ CRIT MISS')
      : r.pass
        ? color('green', '✓ pass')
        : color('red', '✕ fail')
    console.log(
      pad(r.id, 28) +
      pad(sevStr, 8) +
      pad(r.actual.specialty.slice(0, 20), 22) +
      pad(r.actual.source, 11) +
      pad(String(r.actual.latencyMs), 7) +
      status,
    )
    for (const f of r.failures) console.log(color('gray', '    ' + f))
  }

  // Aggregates
  const sources = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.actual.source] = (acc[r.actual.source] ?? 0) + 1
    return acc
  }, {})
  const latencies = results.map(r => r.actual.latencyMs).sort((a, b) => a - b)
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0

  console.log('─'.repeat(80))
  console.log(`pass    : ${color(passRate >= 0.85 ? 'green' : 'red', `${pass}/${results.length}`)} (${(passRate * 100).toFixed(1)}%)`)
  console.log(`fail    : ${color(fail > 0 ? 'red' : 'green', String(fail))}`)
  console.log(`crit    : ${color(critMisses.length > 0 ? 'red' : 'green', `${critMisses.length} critical-miss`)}`)
  console.log(`source  : ${Object.entries(sources).map(([k, v]) => `${k}=${v}`).join('  ')}`)
  console.log(`latency : p50=${p50}ms  p95=${p95}ms`)
  console.log('─'.repeat(80))

  if (critMisses.length > 0) {
    console.log(color('red', '\n⚠ CRITICAL MISSES — emergencies that came back non-emergency:'))
    for (const m of critMisses) {
      console.log(color('red', `  ${m.id}: "${m.input.slice(0, 70)}..."`))
    }
  }

  return { passRate, critMisses: critMisses.length }
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error(color('red', 'No GROQ_API_KEY or OPENAI_API_KEY in env. Cases will exercise only the deterministic fallback path.'))
  }

  const filterEq = process.argv.find(a => a.startsWith('--filter='))?.split('=')[1]
  const filterIdx = process.argv.indexOf('--filter')
  const filter = filterEq ?? (filterIdx >= 0 ? process.argv[filterIdx + 1] : undefined)
  let cases = loadCases()
  if (filter) {
    cases = cases.filter(c => c.id.includes(filter))
    console.log(color('gray', `filter="${filter}" → ${cases.length} cases`))
  }
  if (cases.length === 0) {
    console.error('no cases matched')
    process.exit(2)
  }

  const concurrency = parseInt(process.env.EVAL_CONCURRENCY ?? '2', 10)
  console.log(color('gray', `Running ${cases.length} cases, concurrency=${concurrency}`))
  console.log(color('gray', 'each dot = one batch of ' + concurrency + ' cases'))
  process.stdout.write('progress ')
  const results = await runChunked(cases, concurrency, runOne)
  const { passRate, critMisses } = report(results)

  const threshold = parseFloat(process.env.EVAL_PASS_THRESHOLD ?? '0.85')
  const ok = passRate >= threshold && critMisses === 0
  if (!ok) {
    console.log(color('red', `\n✕ FAILED — pass rate ${(passRate * 100).toFixed(1)}% < threshold ${(threshold * 100).toFixed(0)}% OR critical misses > 0`))
    process.exit(1)
  }
  console.log(color('green', `\n✓ PASSED — pass rate ${(passRate * 100).toFixed(1)}% ≥ ${(threshold * 100).toFixed(0)}%, 0 critical misses`))
}

main().catch(e => {
  console.error(color('red', 'eval harness crashed: '), e)
  process.exit(2)
})
