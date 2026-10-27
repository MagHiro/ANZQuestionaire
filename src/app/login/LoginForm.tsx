'use client'
import { Spinner } from '@/components/Spinner'
import { useActionState } from 'react'
import { ArrowRight } from '@/components/Icons'
import { loginAction } from '@/app/actions'
export function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, '')
  return (
    <form action={action} className="stack">
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          placeholder="you@company.com"
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={72}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button primary" disabled={pending}>
        {pending && <Spinner />}
        {pending ? 'Signing in…' : 'Sign in'}
        <ArrowRight size={17} />
      </button>
    </form>
  )
}
