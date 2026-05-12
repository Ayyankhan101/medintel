#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT/.dev.pid"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MedIntel — Demo Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Install dependencies ──────────────────────────
if [ ! -d "$ROOT/node_modules" ]; then
  echo ""
  echo "▶  Installing dependencies..."
  npm install --prefix "$ROOT"
else
  echo "✓  node_modules present"
fi

# ── 2. Create .env.local if missing ──────────────────
if [ ! -f "$ROOT/.env.local" ]; then
  cp "$ROOT/.env.local.example" "$ROOT/.env.local"
  echo ""
  echo "✓  Created .env.local from template"
  echo ""
  echo "  ⚠  Open .env.local and set your GROQ_API_KEY, then re-run ./start.sh"
  echo ""
  exit 0
fi

# ── 3. Check GROQ_API_KEY is filled in ───────────────
if grep -qE '^GROQ_API_KEY\s*=\s*"your-groq-api-key"' "$ROOT/.env.local"; then
  echo ""
  echo "  ⚠  GROQ_API_KEY is still the placeholder in .env.local"
  echo "     Replace it with your real key, then re-run ./start.sh"
  echo ""
  exit 1
fi
echo "✓  .env.local configured"

# ── 4. Run DB migration + seed if DB missing ─────────
if [ ! -f "$ROOT/prisma/dev.db" ]; then
  echo ""
  echo "▶  Setting up SQLite database..."
  cd "$ROOT"
  npx prisma migrate dev --name init
  npx tsx prisma/seed.ts
else
  echo "✓  Database ready"
fi

# ── 5. Start dev server in background ────────────────
echo ""
echo "▶  Starting Next.js dev server..."
cd "$ROOT"
npm run dev > "$ROOT/.dev.log" 2>&1 &
echo $! > "$PID_FILE"

# Wait for server to be ready
echo -n "   Waiting for http://localhost:3000"
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -qE "^(200|307|404)"; then
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  App running at http://localhost:3000"
echo "  📄  Logs: .dev.log"
echo "  🛑  Stop: ./stop.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
