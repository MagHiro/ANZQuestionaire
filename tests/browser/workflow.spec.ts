import { test, expect } from '@playwright/test'
import { Client } from 'pg'
import { expectCompactTypography } from './typography'
test('staff can create, edit, preview, publish and receive a real submission', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('admin@example.test')
  await page.getByLabel('Password').fill('Browser-test-password-2026')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Questionnaires', exact: true })).toBeVisible()
  expect(
    await page.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeLessThanOrEqual(24)
  await expectCompactTypography(page)
  await page.screenshot({
    path: `test-results/workspace-${test.info().project.name}.png`,
    fullPage: true,
  })
  await page
    .getByLabel('Questionnaire title', { exact: true })
    .fill(`Learning feedback ${test.info().project.name}`)
  await page.getByRole('button', { name: 'Create questionnaire' }).click()
  await expect(page.getByText('Question settings', { exact: true })).toBeVisible()
  await expect(page.locator('.type-chip svg').first()).toBeVisible()
  await expectCompactTypography(page)
  await page
    .getByRole('textbox', { name: 'Question', exact: true })
    .fill('What would you like to learn next?')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.locator('.notice[role="status"]')).toContainText('Draft saved.')
  await expect(page.locator('.app-toast')).toHaveCSS('position', 'fixed')
  await page.getByRole('button', { name: 'Dismiss message', exact: true }).click()
  await expect(page.locator('.app-toast')).toHaveCount(0)
  await page.getByRole('button', { name: 'Try it out' }).click()
  const choiceSizes = await page.locator('.answer-choice').evaluateAll((choices) =>
    choices.map((choice) => ({
      height: choice.getBoundingClientRect().height,
      radius: getComputedStyle(choice).borderRadius,
      padding: getComputedStyle(choice).padding,
    })),
  )
  if (choiceSizes.length) {
    expect(choiceSizes[0].height).toBeGreaterThanOrEqual(52)
    expect(choiceSizes[0].height).toBeLessThanOrEqual(58)
    expect(choiceSizes[0].radius).toBe('8px')
    expect(choiceSizes.every((choice) => choice.height === choiceSizes[0].height)).toBe(true)
  }
  await expectCompactTypography(page)
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
  await expectCompactTypography(page)
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
  // Add report settings only in this isolated test release to exercise the staff UI.
  const database = new Client({
    connectionString: 'postgresql://test:test-local-only@127.0.0.1:55439/postgres',
  })
  await database.connect()
  try {
    await database.query(
      `UPDATE releases SET definition = jsonb_set(jsonb_set(definition, '{payment}', $1::jsonb), '{questions}', (definition->'questions') || '[{"id":"email","title":"Email address","type":"email","required":true}]'::jsonb) WHERE id = (SELECT release_id FROM responses WHERE id = $2)`,
      [
        JSON.stringify({
          enabled: true,
          amountMinor: 100,
          currency: 'aud',
          emailQuestionId: 'email',
          reportExpected: true,
        }),
        responseId,
      ],
    )
  } finally {
    await database.end()
  }
  await page.goto(builder.replace('/builder/', '/responses/'))
  await expectCompactTypography(page)
  await page.locator('summary').first().click()
  await expect(page.getByText('Communication', { exact: true })).toBeVisible()
  const upload = page.getByLabel('Private PDF report', { exact: true })
  await expect(upload).toHaveCSS('opacity', '0')
  await expect(page.locator('.report-file-button')).toBeVisible()
  await upload.setInputFiles({
    name: 'invalid.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  })
  await expect(page.locator('.report-manager').getByRole('alert')).toContainText(
    'Choose a PDF file no larger than 10 MB.',
  )
  await page.route('**/api/reports/*', (route) => route.fulfill({ status: 200, body: 'OK' }))
  await upload.setInputFiles({
    name: 'assessment.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 test'),
  })
  await expect(page.locator('.report-file-name')).toHaveText('assessment.pdf')
  await expect(page.getByRole('status')).toContainText('Report uploaded.')
  await expect(page.getByRole('button', { name: 'Publish report & queue email' })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: `test-results/responses-${test.info().project.name}.png`,
    fullPage: true,
  })
  const paidDatabase = new Client({
    connectionString: 'postgresql://test:test-local-only@127.0.0.1:55439/postgres',
  })
  await paidDatabase.connect()
  try {
    await paidDatabase.query(
      "UPDATE responses SET payment_status='paid',amount_minor=12900,currency='aud',paid_at=now() WHERE id=$1",
      [responseId],
    )
  } finally {
    await paidDatabase.end()
  }
  const guest = await page.context().browser()!.newContext()
  const receiptPath = `/api/receipts/${responseId}`
  expect((await guest.request.get(receiptPath)).status()).toBe(404)
  expect((await guest.request.get(`${receiptPath}?token=invalid`)).status()).toBe(404)
  const receipt = await guest.request.get(receiptPath + confirmation.search)
  expect(receipt.status()).toBe(200)
  expect(receipt.headers()['content-type']).toBe('application/pdf')
  expect(receipt.headers()['cache-control']).toBe('no-store')
  expect((await receipt.body()).subarray(0, 5).toString()).toBe('%PDF-')
  const confirmationPage = await guest.newPage()
  await confirmationPage.goto(`http://127.0.0.1:3199${privatePath}`)
  await expect(confirmationPage.getByRole('heading', { name: 'Payment verified' })).toBeVisible()
  await expect(confirmationPage.getByRole('link', { name: 'Download receipt' })).toBeVisible()
  await confirmationPage.screenshot({
    path: `test-results/payment-confirmation-${test.info().project.name}.png`,
    fullPage: true,
  })
  await guest.close()
  await page.route(url, async (route) => {
    const response = await route.fetch()
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': "frame-ancestors 'self'",
        'x-frame-options': 'SAMEORIGIN',
      },
    })
  })
  await page.route('**/embedded-questionnaire-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<iframe title="Embedded questionnaire" src="${url}" style="width:100%;height:800px;border:0"></iframe>`,
    }),
  )
  // Frame the runner on the same origin; no production embedding policy is changed.
  await page.goto('/embedded-questionnaire-test')
  await page.route('**/api/responses', (route) =>
    route.fulfill({ json: { id: responseId, statusUrl: privatePath } }),
  )
  const frame = page.frameLocator('iframe')
  await frame
    .getByRole('textbox', { name: 'What would you like to learn next?' })
    .fill('Embedded response')
  await frame.getByRole('button', { name: 'Continue', exact: true }).click()
  await frame
    .getByRole('textbox', { name: 'Email address', exact: true })
    .fill('respondent@example.test')
  await frame.getByRole('button', { name: 'Continue', exact: true }).click()
  await frame.getByRole('checkbox', { name: /I’m ready/ }).check()
  await frame.getByRole('button', { name: 'Submit answers' }).click()
  await expect(frame.getByText(/Continue in a secure new tab/)).toBeVisible()
  await expect(frame.getByRole('link', { name: 'Continue to payment & report' })).toHaveAttribute(
    'target',
    '_blank',
  )
})
