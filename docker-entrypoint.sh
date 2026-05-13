#!/bin/sh
set -e

# Push schema to SQLite and run seed only if the DB is brand new
DB_PATH="${DATABASE_URL#file:}"

if [ ! -f "$DB_PATH" ]; then
  echo "[medintel] New database — running migrations and seed…"
  npx prisma db push --skip-generate
  npx tsx prisma/seed.ts
else
  echo "[medintel] Existing database found — applying any schema changes…"
  npx prisma db push --skip-generate --accept-data-loss
fi

exec npm run start
