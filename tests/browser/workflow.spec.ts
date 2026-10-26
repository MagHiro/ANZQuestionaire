import { test, expect } from '@playwright/test'
test('staff can create, edit, preview, publish and receive a real submission', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('admin@example.test')
  await page.getByLabel('Password').fill('Browser-test-password-2026')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Make room/ })).toBeVisible()
  await page
    .getByLabel('Questionnaire title', { exact: true })
    .fill(`Learning feedback ${test.info().project.name}`)
  await page.getByRole('button', { name: 'Create questionnaire' }).click()
  await expect(page.getByText('QUESTION SETTINGS')).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Question', exact: true })
    .fill('What would you like to learn next?')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByRole('status')).toContainText('Draft saved.')
  await page.getByRole('button', { name: 'Try it out' }).click()
  await page.getByRole('textbox', { name: 'What would you like to learn next?' }).fill('Leadership')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ready when you are.' })).toBeVisible()
  await page.getByRole('checkbox', { name: /I’m ready/ }).check()
  await page.getByRole('button', { name: 'Submit answers' }).click()
  await expect(page.getByText('Preview only. No response was saved.')).toBeVisible()
  await page.getByRole('button', { name: 'Close preview' }).click()
  await page.screenshot({
    path: `test-results/builder-${test.info().project.name}.png`,
    fullPage: true,
  })
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Version 1 published')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const url = await page.getByLabel('Public questionnaire link').inputValue()
  const embedHeaders = await page.request.get(url)
  expect(embedHeaders.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  await page
    .getByLabel('Allowed embedding origins — one per line')
    .fill('https://www.anzmigrate.com')
  await page.getByRole('button', { name: 'Save integration settings' }).click()
  await expect(page.getByRole('status')).toContainText('Integration settings saved')
  const allowedEmbed = await page.request.get(url)
  expect(allowedEmbed.headers()['content-security-policy']).toContain(
    'frame-ancestors https://www.anzmigrate.com',
  )
  const builder = page.url()
  await page.goto(url)
  await page
    .getByRole('textbox', { name: 'What would you like to learn next?' })
    .fill('Communication')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('checkbox', { name: /I’m ready/ }).check()
  await page.getByRole('button', { name: 'Submit answers' }).click()
  await expect(page.getByRole('heading', { name: 'Thank you. You’re all done.' })).toBeVisible()
  await page.goto(builder.replace('/builder/', '/responses/'))
  await page.locator('summary').first().click()
  await expect(page.getByText('Communication', { exact: true })).toBeVisible()
})
