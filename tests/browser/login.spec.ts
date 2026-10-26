import { test, expect } from '@playwright/test'
test('sign-in page is responsive and exposes accessible form controls', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
    'Poppins',
  )
  await page.screenshot({
    path: `test-results/login-${test.info().project.name}.png`,
    fullPage: true,
  })
})
