import { test, expect } from '@playwright/test'
test('sign-in page is responsive and exposes accessible form controls', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  const headingSize = await page
    .locator('h1')
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(headingSize).toBeGreaterThanOrEqual(24)
  expect(headingSize).toBeLessThanOrEqual(30)
  expect(
    await page.locator('h2').evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeLessThanOrEqual(22)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
    'Poppins',
  )
  await page.screenshot({
    path: `test-results/login-${test.info().project.name}.png`,
    fullPage: true,
  })
})

test('sign-in shows an animated pending state and an accessible failure', async ({ page }) => {
  await page.goto('/login')
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/login', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    await pending
    await route.continue()
  })
  await page.getByLabel('Email address').fill('invalid@example.com')
  await page.getByLabel('Password').fill('incorrect-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const button = page.getByRole('button', { name: 'Signing in…' })
  await expect(button).toBeDisabled()
  await expect(button.locator('.ui-spinner')).toBeVisible()
  release()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
})
