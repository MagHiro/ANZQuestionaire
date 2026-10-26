import type { Metadata } from 'next'
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import './globals.css'
import './brand.css'

export const metadata: Metadata = {
  title: { default: 'ANZ Questionnaire', template: '%s · ANZ Questionnaire' },
  description: 'Thoughtful questions. Clearer next steps.',
  robots: { index: false, follow: false },
}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
