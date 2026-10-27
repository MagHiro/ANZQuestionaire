import { test, expect } from '@playwright/test'

test('administrator can compose, preview and save a React Email document', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('admin@example.test')
  await page.getByLabel('Password').fill('Browser-test-password-2026')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Make room/ })).toBeVisible()
  await page.goto('/settings/email')
  const kind = test.info().project.name === 'desktop' ? 'submission' : 'report'
  await page.getByRole('combobox', { name: 'Event template' }).selectOption(kind)
  const message = `A personal closing message ${test.info().project.name}`
  await page.getByLabel('Subject', { exact: true }).fill('Thanks for answering')
  const editor = page.getByRole('region', { name: 'Compose email' }).getByRole('textbox')
  await expect(editor).toBeVisible()
  const rendered = page.frameLocator('iframe[title="Email preview"]')
  await expect(
    rendered.getByRole('link', { name: 'View confirmation and report' }),
  ).toHaveAttribute('href', 'https://tf.anzmigrate.com')
  await editor.fill(message)
  await editor.press('ControlOrMeta+a')
  await editor.press('ControlOrMeta+b')
  await expect(rendered.getByText(message, { exact: true })).toBeVisible()
  await page.getByLabel('Preview size').selectOption('mobile')
  await expect(page.locator('iframe')).toHaveClass(/email-preview-mobile/)
  await page.getByRole('button', { name: 'Save template' }).click()
  await expect(page.locator('.notice[role="status"]')).toHaveText('Template saved.')
  await page.reload()
  await page.getByRole('combobox', { name: 'Event template' }).selectOption(kind)
  await expect(editor).toContainText(message)
  await expect(rendered.getByText(message, { exact: true })).toBeVisible()
  await expect(rendered.locator('strong').filter({ hasText: message })).toBeVisible()
  await page.screenshot({
    path: `test-results/react-email-${test.info().project.name}.png`,
    fullPage: true,
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
