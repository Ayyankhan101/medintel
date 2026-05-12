#!/usr/bin/env bash

ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT/.dev.pid"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MedIntel — Demo Stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$PID_FILE" ]; then
  echo ""
  echo "  No running server found (no .dev.pid file)."

  # Try to kill any stray next-server process on port 3000
  STRAY=$(lsof -ti :3000 2>/dev/null)
  if [ -n "$STRAY" ]; then
    echo "  Found process on port 3000 (PID $STRAY) — killing it."
    kill "$STRAY" 2>/dev/null
    echo "  ✅  Stopped."
  fi

  echo ""
  exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
  echo ""
  echo "▶  Stopping server (PID $PID)..."
  kill "$PID"
  # Give it a moment to exit cleanly
  sleep 1
  # Force-kill if still running
  kill -0 "$PID" 2>/dev/null && kill -9 "$PID" 2>/dev/null || true
  echo "  ✅  Server stopped."
else
  echo ""
  echo "  Process $PID not running (may have already exited)."
fi

rm -f "$PID_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
