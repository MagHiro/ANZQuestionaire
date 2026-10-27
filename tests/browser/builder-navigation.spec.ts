import { test, expect } from '@playwright/test'

test('question navigation preserves order, handles reorder, and panels scroll independently', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('admin@example.test')
  await page.getByLabel('Password').fill('Browser-test-password-2026')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByLabel('Questionnaire title', { exact: true }).fill('Navigation test')
  await page.getByRole('button', { name: 'Create questionnaire' }).click()
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('First question')
  await page.getByRole('button', { name: 'Add question', exact: true }).click()
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('Second question')
  const items = page.locator('.question-nav-item')
  await page.getByRole('button', { name: 'Previous question', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Question', exact: true })).toHaveValue(
    'First question',
  )
  await expect(items.nth(0)).toContainText('First question')
  await page.getByRole('button', { name: 'Next question', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Question', exact: true })).toHaveValue(
    'Second question',
  )
  await expect(items.nth(1)).toContainText('Second question')

  const handle = page.getByRole('button', { name: 'Reorder question 2', exact: true })
  await handle.focus()
  await page.keyboard.press('Space')
  await expect(page.locator('.sortable-row.dragging')).toHaveCount(1)
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
  await page.keyboard.press(test.info().project.name === 'mobile' ? 'ArrowLeft' : 'ArrowUp')
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
  await page.keyboard.press('Space')
  await expect(items.nth(0)).toContainText('Second question')
  if (test.info().project.name === 'desktop') {
    const source = await page
      .getByRole('button', { name: 'Reorder question 1', exact: true })
      .boundingBox()
    const target = await page
      .getByRole('button', { name: 'Reorder question 2', exact: true })
      .boundingBox()
    await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2)
    await page.mouse.down()
    await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, {
      steps: 12,
    })
    await page.mouse.up()
    await expect(items.nth(1)).toContainText('Second question')
    await expect(page.locator('.sortable-row.dragging')).toHaveCount(0)
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    )
  }
  await expect(page.getByRole('textbox', { name: 'Question', exact: true })).toHaveValue(
    'Second question',
  )
  await page.getByRole('button', { name: 'Logic', exact: true }).click()
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.locator('.logic-inspector').getByLabel('Default next step')).toBeVisible()
  await page.getByRole('button', { name: 'Outcomes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Result options', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Generate results with AI/ })).toBeVisible()
  await expect(page.getByLabel('Paid questionnaire')).toHaveCount(0)
  await page.getByRole('button', { name: 'Add result option', exact: true }).click()
  await page.getByLabel('Result title', { exact: true }).fill('First outcome')
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.getByRole('button', { name: 'Add result option', exact: true }).click()
  await page.getByLabel('Result title', { exact: true }).fill('Second outcome')
  await expect(page.getByLabel('Result title', { exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Close outcome editor' }).click()
  const firstOutcome = page.getByRole('button', { name: /First outcome All of 1 condition/ })
  await expect(firstOutcome).toHaveAttribute('aria-haspopup', 'dialog')
  await firstOutcome.click()
  await expect(page.getByLabel('Result title', { exact: true })).toHaveValue('First outcome')
  await page.getByLabel('Result message', { exact: true }).fill('Saved while collapsed')
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Result title', { exact: true })).toHaveCount(0)
  await expect(firstOutcome).toBeFocused()
  await firstOutcome.focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('textbox', { name: 'Result message', exact: true })).toHaveValue(
    'Saved while collapsed',
  )
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()
  await page.getByRole('button', { name: 'Done', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close outcome editor' })).toBeFocused()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.getByRole('button', { name: 'Create result options', exact: true }).click()
  await expect(page.getByLabel('Instructions for AI')).toHaveValue(/decision criteria/)
  if (test.info().project.name === 'desktop') {
    await page.evaluate(() => {
      document.querySelector('.editing-content')!.scrollTop = 10000
    })
    await expect(page.getByRole('button', { name: /Generate results with AI/ })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    )
  }
  await page.getByRole('button', { name: /Generate results with AI/ }).click()
  await expect(page.getByLabel('Instructions for AI')).not.toBeVisible()
  await page.getByRole('button', { name: /Generate results with AI/ }).click()
  await page.route('**/api/ai/proposal', async (route) => {
    const body = route.request().postDataJSON()
    const definition = structuredClone(body.definition)
    definition.questions[0].title = 'Clearer question wording'
    await route.fulfill({
      contentType: 'application/x-ndjson',
      body: JSON.stringify({ proposal: { summary: 'Improved wording.', definition } }) + '\n',
    })
  })
  await page.getByRole('button', { name: 'Suggest changes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Proposed changes' })).toBeVisible()
  await page.getByText('Review 1 changes', { exact: true }).click()
  await expect(page.locator('.proposal-comparison')).toContainText('Clearer question wording')
  await expect(page.getByRole('button', { name: 'Apply to draft' })).toBeVisible()
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByLabel('Paid questionnaire')).toHaveCount(0)
  await page.getByRole('button', { name: 'Payment', exact: true }).click()
  await expect(page.getByLabel('Paid questionnaire')).toBeVisible()
  await page.getByLabel('Paid questionnaire').check()
  await expect(page.getByRole('button', { name: 'Outcomes', exact: true })).toHaveCount(0)
  await page.getByLabel('Paid questionnaire').uncheck()
  await expect(page.getByRole('button', { name: 'Outcomes', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add result option', exact: true })).toHaveCount(0)

  if (test.info().project.name === 'desktop') {
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    for (let i = 0; i < 18; i++)
      await page.getByRole('button', { name: 'Add question', exact: true }).click()
    const measurements = await page.evaluate(() => {
      const list = document.querySelector('.question-nav-list')!
      const settings = document.querySelector('.settings-panel')!
      list.scrollTop = 300
      settings.scrollTop = 200
      return { list: list.scrollTop, settings: settings.scrollTop, document: window.scrollY }
    })
    expect(measurements.list).toBeGreaterThan(0)
    expect(measurements.settings).toBeGreaterThan(0)
    expect(measurements.document).toBe(0)
    await page.screenshot({ path: 'test-results/builder-panels-desktop.png' })
  }
})
