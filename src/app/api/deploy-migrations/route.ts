import { PrismaClient } from '@prisma/client'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

export async function GET() {
  const migrationsDir = join(process.cwd(), 'prisma', 'migrations')

  let dirs: string[]
  try {
    dirs = readdirSync(migrationsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()
  } catch {
    return Response.json({ ok: false, error: 'Migrations directory not found' }, { status: 500 })
  }

  // Check which migrations are already applied
  const applied = new Set<string>()
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      "SELECT migration_name FROM _prisma_migrations ORDER BY migration_name",
    )
    for (const r of rows) applied.add(r.migration_name)
  } catch {
    // _prisma_migrations table may not exist yet
  }

  const results: Array<{ name: string; ok: boolean; error?: string }> = []

  for (const dir of dirs) {
    if (applied.has(dir)) {
      results.push({ name: dir, ok: true })
      continue
    }

    const migrationFile = join(migrationsDir, dir, 'migration.sql')
    if (!existsSync(migrationFile)) {
      results.push({ name: dir, ok: false, error: 'migration.sql not found' })
      continue
    }

    const sql = readFileSync(migrationFile, 'utf-8')

    try {
      await prisma.$executeRawUnsafe(sql)
      // Record the migration in _prisma_migrations table
      const checksum = hashString(sql)
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" ("migration_name", "started_at", "finished_at", "migration_file", "checksum", "rolled_back_at", "applied_steps_count")
         VALUES ($1, NOW(), NOW(), $2, $3, NULL, 1)`,
        dir,
        `migrations/${dir}/migration.sql`,
        checksum,
      )
      results.push({ name: dir, ok: true })
    } catch (e: unknown) {
      results.push({ name: dir, ok: false, error: String(e) })
    }
  }

  await prisma.$disconnect()

  const ok = results.every(r => r.ok)
  return Response.json({ ok, results })
}

function hashString(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
