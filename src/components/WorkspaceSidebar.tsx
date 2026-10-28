import Link from 'next/link'
import { Brand } from '@/components/Brand'
import { Layers } from '@/components/Icons'
import { SubmitButton } from '@/components/SubmitButton'
import { logoutAction } from '@/app/actions'
import type { Staff } from '@/server/auth'

export function WorkspaceSidebar({
  staff,
  active,
}: {
  staff: Staff
  active: 'questionnaires' | 'ai' | 'email'
}) {
  return (
    <aside className="sidebar">
      <Brand />
      <Link
        href="/"
        className={`nav-item ${active === 'questionnaires' ? 'active' : ''}`}
        aria-current={active === 'questionnaires' ? 'page' : undefined}
      >
        <Layers size={18} />
        Questionnaires
      </Link>
      {staff.role === 'admin' && (
        <Link
          href="/settings/ai"
          className={`nav-item ${active === 'ai' ? 'active' : ''}`}
          aria-current={active === 'ai' ? 'page' : undefined}
        >
          AI settings
        </Link>
      )}
      {staff.role === 'admin' && (
        <Link
          href="/settings/email"
          className={`nav-item ${active === 'email' ? 'active' : ''}`}
          aria-current={active === 'email' ? 'page' : undefined}
        >
          Email builder
        </Link>
      )}
      <div className="staff">
        <span className="avatar">{staff.name.slice(0, 1)}</span>
        <div>
          {staff.name}
          <small>{staff.role}</small>
        </div>
        <form action={logoutAction}>
          <SubmitButton className="text-button">Exit</SubmitButton>
        </form>
      </div>
    </aside>
  )
}
