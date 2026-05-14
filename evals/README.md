# Evaluation harnesses

## Triage agent

Catches regressions in `src/lib/triage/agent.ts`. Runs ~30 canned patient
complaints through the agent, scores each one against an acceptable severity
band + acceptable specialty list, and reports pass rate + critical-miss count.

### Run it

```bash
# Local — picks up GROQ_API_KEY from .env.local
npm run eval:triage

# Filter to a subset
npx tsx evals/triage/run.ts --filter crit-
npx tsx evals/triage/run.ts --filter peds-

# Tune concurrency and pass threshold
EVAL_CONCURRENCY=1 EVAL_PASS_THRESHOLD=0.85 npm run eval:triage
```

### Cases

Each line of `evals/triage/cases.jsonl` is one case:

```json
{
  "id":     "crit-01-cant-breathe",
  "input":  "I cannot breathe properly...",
  "expect": {
    "minSeverity": 8,
    "maxSeverity": 10,
    "specialties": ["Emergency Medicine", "Pulmonology"],
    "isEmergency": true
  },
  "notes":  "Regression: previously returned severity 4"
}
```

Bands are intentionally wide — there is no one true answer; the goal is to
catch obvious regressions (severity 4 for "can't breathe") rather than enforce
exact numbers.

### Scoring

A case passes only if **all** of the following hold:

1. `actual.severityScore` is within `[minSeverity, maxSeverity]`
2. `actual.specialty` ∈ `specialties[]`
3. If `expect.isEmergency` is set, `actual.isEmergency` matches it

A **critical miss** is any case where `expect.isEmergency === true` but the
agent returned `isEmergency: false`. This is the worst possible failure mode
(a true emergency routed as routine) and the harness exits 1 if there's
even one.

### Limits

The harness runs against the live Groq API and consumes tokens fast. The free
tier has a 100k tokens-per-day cap; one full run uses ~40k. If you see most
results coming back as `source: fallback` with latency under 300ms, you've
hit the daily TPD cap — wait, or upgrade your Groq plan.

For CI: run on PRs that touch `src/lib/triage/`, gate merge on
`EVAL_PASS_THRESHOLD=0.85` and zero critical misses.
