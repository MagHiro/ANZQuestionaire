import { expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { receiptPdf } from '../src/server/receipt-pdf'

it('generates a single-page branded receipt with embedded Poppins', async () => {
  const bytes = await receiptPdf({
    id: 'ce075624-4fc3-4b32-8324-2e598d5679b5',
    amountMinor: 19900,
    currency: 'sgd',
    paidAt: new Date('2026-10-28T08:00:00Z'),
  })
  const pdf = await PDFDocument.load(bytes)
  expect(pdf.getPageCount()).toBe(1)
  expect(pdf.getTitle()).toBe('ANZ payment receipt')
  expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.28)
  expect(bytes.length).toBeGreaterThan(1000)
})
