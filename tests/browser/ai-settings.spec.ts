import { expect, test } from '@playwright/test'
import { expectCompactTypography } from './typography'
test('admin saves provider settings without returning its key to the browser', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('admin@example.test')
  await page.getByLabel('Password').fill('Browser-test-password-2026')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('heading', { name: 'Questionnaires', exact: true }).waitFor()
  await page.goto('/settings/ai')
  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.sidebar').getByRole('link', { name: 'AI settings' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expectCompactTypography(page)
  await expect(page.getByRole('heading', { name: 'Your AI, your choice.' })).toBeVisible()
  await page.getByLabel('Provider', { exact: true }).selectOption('Custom')
  await page.getByLabel('API base URL').fill('https://api.openai.com/v1')
  await page.getByLabel('Model ID').fill('configured-test-model')
  await page.getByLabel('API key', { exact: true }).fill('test-secret-not-a-real-key')
  await page.getByRole('button', { name: 'Save AI settings' }).click()
  await expect(page.locator('.success[role="status"]')).toContainText('AI settings saved')
  await page.reload()
  await expect(page.getByLabel('Model ID')).toHaveValue('configured-test-model')
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('')
  expect(await page.content()).not.toContain('test-secret-not-a-real-key')
  await expect(page.getByRole('button', { name: 'Test saved connection' })).toBeEnabled()
})
