import { Brand } from '@/components/Brand'
import { LoginForm } from './LoginForm'
export default function LoginPage() {
  return (
    <main className="login-layout">
      <section className="login-story">
        <Brand />
        <div>
          <h1>ANZ Questionnaire</h1>
          <p>Create questionnaires and manage responses.</p>
        </div>
      </section>
      <section className="login-panel">
        <div>
          <h2>Sign in</h2>
          <LoginForm />
          <p className="small muted">Need access? Ask your workspace administrator.</p>
        </div>
      </section>
    </main>
  )
}
