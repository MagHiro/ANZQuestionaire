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
  await expect(page.getByText('Question settings', { exact: true })).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Question', exact: true })
    .fill('What would you like to learn next?')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.locator('.notice[role="status"]')).toContainText('Draft saved.')
  await page.getByRole('button', { name: 'Try it out' }).click()
  await page.getByRole('textbox', { name: 'What would you like to learn next?' }).fill('Leadership')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ready when you are.' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /I’m ready/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Submit answers' }).click()
  await expect(page.getByText('Preview only. No response was saved.')).toBeVisible()
  await page.getByRole('button', { name: 'Close preview' }).click()
  await page.screenshot({
    path: `test-results/builder-${test.info().project.name}.png`,
    fullPage: true,
  })
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page.locator('.notice[role="status"]')).toContainText('Version 1 published')
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.locator('.notice[role="status"]')).toContainText('Draft saved')
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('Draft-only wording')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.locator('.notice[role="status"]')).toContainText('Draft saved')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const url = await page.getByLabel('Public questionnaire link').inputValue()
  const embedHeaders = await page.request.get(url)
  expect(embedHeaders.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  await page
    .getByLabel('Allowed embedding origins — one per line')
    .fill('https://www.anzmigrate.com')
  await page.getByRole('button', { name: 'Save integration settings' }).click()
  await expect(page.locator('.notice[role="status"]')).toContainText('Integration settings saved')
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
  await expect(page.getByRole('checkbox', { name: /I’m ready/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Submit answers' }).click()
  await expect(page.getByRole('heading', { name: 'Thank you. You’re all done.' })).toBeVisible()
  const confirmationContent = page.locator('.confirmation-content')
  await expect(confirmationContent).toBeVisible()
  const confirmationWidth = await confirmationContent.evaluate(
    (el) => el.getBoundingClientRect().width,
  )
  expect(confirmationWidth).toBeGreaterThan((page.viewportSize()?.width || 0) * 0.85)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: `test-results/confirmation-${test.info().project.name}.png`,
    fullPage: true,
  })
  const confirmationLink = await page
    .getByRole('link', { name: 'View confirmation', exact: true })
    .getAttribute('href')
  expect(confirmationLink).toBeTruthy()
  const confirmation = new URL(confirmationLink!)
  const privatePath = confirmation.pathname + confirmation.search
  const privatePage = await page.request.get(privatePath)
  expect(privatePage.ok()).toBe(true)
  expect(privatePage.headers()['cache-control']).toContain('no-store')
  expect(privatePage.headers()['referrer-policy']).toBe('no-referrer')
  expect(await privatePage.text()).toContain('Thank you. You’re all done.')
  expect((await page.request.get(confirmation.pathname)).status()).toBe(404)
  const responseId = confirmation.pathname.split('/').pop()
  const respondent = await page.context().browser()!.newContext()
  expect(
    (
      await respondent.request.get(
        `http://127.0.0.1:3199/api/reports/${responseId}${confirmation.search}`,
      )
    ).status(),
  ).toBe(404)
  await respondent.close()
  await page.goto(builder.replace('/builder/', '/responses/'))
  await page.locator('summary').first().click()
  await expect(page.getByText('Communication', { exact: true })).toBeVisible()
})
