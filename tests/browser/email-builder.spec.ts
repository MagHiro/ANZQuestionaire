import { test, expect } from '@playwright/test'

test('administrator can compose, preview and save notification blocks', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('admin@example.test')
  await page.getByLabel('Password').fill('Browser-test-password-2026')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Make room/ })).toBeVisible()
  await page.goto('/settings/email')
  await expect(page.getByRole('heading', { name: 'Email builder', exact: true })).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Event template' })
    .selectOption(test.info().project.name === 'desktop' ? 'submission' : 'report')
  const message = `A personal closing message ${test.info().project.name}`
  await page.getByLabel('Subject', { exact: true }).fill('Thanks for answering')
  await page.getByRole('button', { name: 'Add text', exact: true }).click()
  await page.getByRole('textbox', { name: 'Content', exact: true }).last().fill(message)
  await page.getByRole('textbox', { name: 'Content', exact: true }).last().press('ControlOrMeta+a')
  await page.getByRole('button', { name: 'Bold', exact: true }).last().click()
  await expect(
    page.frameLocator('iframe[title="Email preview"]').getByText(message, { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save template' }).click()
  await expect(page.getByRole('status')).toHaveText('Template saved.')
  await expect(
    page
      .frameLocator('iframe[title="Email preview"]')
      .locator('strong')
      .filter({ hasText: message }),
  ).toBeVisible()
  await page.reload()
  await page
    .getByRole('combobox', { name: 'Event template' })
    .selectOption(test.info().project.name === 'desktop' ? 'submission' : 'report')
  await expect(
    page
      .frameLocator('iframe[title="Email preview"]')
      .locator('strong')
      .filter({ hasText: message }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
