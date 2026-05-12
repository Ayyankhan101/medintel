#!/usr/bin/env node
import { existsSync, copyFileSync, readFileSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit' })
}

console.log('\n── MedIntel Dev Setup ──────────────────────────────────')

// 1. Create .env.local from example if missing
const envPath     = join(root, '.env.local')
const envExample  = join(root, '.env.local.example')
if (!existsSync(envPath)) {
  copyFileSync(envExample, envPath)
  console.log('✓  Created .env.local from .env.local.example')
  console.log('   → Open .env.local and add your GROQ_API_KEY before continuing.\n')
  process.exit(0)
} else {
  console.log('✓  .env.local already exists')
}

// 2. Check GROQ_API_KEY is set
const envContent = readFileSync(envPath, 'utf8')
if (!envContent.match(/^GROQ_API_KEY\s*=\s*".+"/m)) {
  console.warn('\n⚠  GROQ_API_KEY not set in .env.local — AI features will not work.\n')
}

// 3. Generate Prisma client
run('npx prisma generate')

// 4. Run migrations
run('npx prisma migrate dev --name init')

// 5. Seed demo data
run('npx tsx prisma/seed.ts')

console.log('\n── Done ────────────────────────────────────────────────')
console.log('   Run:  npm run dev')
console.log('   Open: http://localhost:3000\n')
