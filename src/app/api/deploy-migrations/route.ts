import { execSync } from 'child_process'

export async function GET() {
  try {
    const result = execSync('npx prisma migrate deploy', {
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env, PATH: process.env.PATH },
    })
    return Response.json({ ok: true, output: result })
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    return Response.json({
      ok: false,
      output: err.stdout ?? '',
      error: err.stderr ?? err.message ?? String(e),
    }, { status: 500 })
  }
}
