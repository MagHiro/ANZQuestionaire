import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'

export async function receiptPdf(input: {
  id: string
  amountMinor: number
  currency: string
  paidAt: Date
}) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(
    await readFile(join(process.cwd(), 'public/fonts/Poppins-Regular.ttf')),
    { subset: true },
  )
  pdf.setTitle('ANZ payment receipt')
  pdf.setAuthor('ANZ Questionnaire')
  pdf.setSubject('Verified questionnaire payment')
  const page = pdf.addPage([595.28, 841.89])
  const ink = rgb(6 / 255, 35 / 255, 79 / 255)
  const muted = rgb(69 / 255, 94 / 255, 125 / 255)
  const divider = rgb(217 / 255, 225 / 255, 234 / 255)
  const soft = rgb(238 / 255, 244 / 255, 1)
  const left = 40
  const right = 555.28
  const text = (value: string, x: number, y: number, size = 15, color = ink) =>
    page.drawText(value, { x, y, size, font, color })
  const alignedRight = (value: string, y: number, size = 15) =>
    text(value, right - font.widthOfTextAtSize(value, size), y, size)
  const rule = (y: number) =>
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.7, color: divider })
  const amount = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: input.currency,
    currencyDisplay: 'code',
  }).format(input.amountMinor / 100)

  text('ANZ Questionnaire', left, 782, 16)
  text('tf.anzmigrate.com', left, 757, 13, muted)
  rule(732)
  text('Payment receipt', left, 687, 24)
  text('Payment verified', left, 657, 15)

  text('Receipt reference', left, 605, 13, muted)
  text(input.id, left, 581, 13)
  text('Payment date', left, 541, 13, muted)
  text(
    input.paidAt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }) + ' (UTC)',
    left,
    517,
    15,
  )

  page.drawRectangle({ x: left, y: 443, width: right - left, height: 38, color: soft })
  text('Description', left + 12, 455, 13, muted)
  text('Amount', right - 12 - font.widthOfTextAtSize('Amount', 13), 455, 13, muted)
  text('Questionnaire assessment and report', left, 413, 15)
  alignedRight(amount, 413)
  rule(359)
  text('Total paid', left, 325, 16)
  alignedRight(amount, 325, 20)
  text('Balance due', left, 288, 13, muted)
  alignedRight(
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency: input.currency,
      currencyDisplay: 'code',
    }).format(0),
    288,
    13,
  )

  rule(137)
  text('This receipt confirms payment. It is not a tax invoice.', left, 110, 13, muted)
  text('Keep this receipt for your records.', left, 85, 13, muted)
  return new Uint8Array(await pdf.save())
}
