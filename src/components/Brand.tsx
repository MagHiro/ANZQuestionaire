import Link from 'next/link'
import { Command } from '@/components/Icons'
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <Command size={20} />
      </span>
      <span>
        Questionnaire<span className="brand-by">by ANZ</span>
      </span>
    </Link>
  )
}
