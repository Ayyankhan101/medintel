import { test, expect } from '@playwright/test'

/**
 * Auth smoke. Uses the seeded demo accounts created by
 *   `tsx scripts/seed-demo-accounts.ts`
 *
 * Demo accounts have no emailVerifyToken set, so they pass the
 * "grandfathered" check in src/lib/auth.ts authorize().
 */
const PATIENT = { email: 'patient@demo.medintel.app', password: 'Demo1234' }
const DOCTOR  = { email: 'doctor@demo.medintel.app',  password: 'Demo1234' }

test.describe('auth', () => {
  test('login form rejects bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('nope@nowhere.test')
    await page.getByLabel('Password').fill('wrongwrongwrong')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  })

  test('forgot-password page sends silently and shows confirmation', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel('Email').fill('does-not-exist@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(page.getByText(/a reset link is on its way/i)).toBeVisible()
  })

  test('patient can sign in and lands on intake', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(PATIENT.email)
    await page.getByLabel('Password').fill(PATIENT.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/intake/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/intake/)
  })

  test('doctor can sign in and lands on dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(DOCTOR.email)
    await page.getByLabel('Password').fill(DOCTOR.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/doctor\/dashboard/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/doctor\/dashboard/)
  })
})
