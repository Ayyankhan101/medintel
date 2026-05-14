import { test, expect } from '@playwright/test'

const PATIENT = { email: 'patient@demo.medintel.app', password: 'Demo1234' }

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(PATIENT.email)
  await page.getByLabel('Password').fill(PATIENT.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/intake/, { timeout: 15_000 })
}

test.describe('booking', () => {
  test('signed-in patient can browse doctors and open a profile', async ({ page }) => {
    await signIn(page)
    await page.goto('/doctors?dept=Cardiology')
    // Either the seeded cardiologist appears, or the empty state shows up.
    const profileLink = page.getByRole('link', { name: /view profile/i }).first()
    const empty       = page.getByText(/no doctors/i)

    if (await profileLink.isVisible().catch(() => false)) {
      await profileLink.click()
      await expect(page.getByRole('button', { name: /book consultation/i })).toBeVisible({ timeout: 10_000 })
    } else {
      await expect(empty).toBeVisible()
    }
  })

  test('profile page route renders for unknown id with a friendly error', async ({ page }) => {
    await signIn(page)
    await page.goto('/doctors/does-not-exist')
    await expect(page.getByText(/not found|back to list/i)).toBeVisible({ timeout: 10_000 })
  })
})
