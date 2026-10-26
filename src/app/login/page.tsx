import { Brand } from '@/components/Brand'
import { LoginForm } from './LoginForm'
export default function LoginPage() {
  return (
    <main className="login-layout">
      <section className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">A little curiosity goes a long way.</span>
          <h1>
            Better questions.
            <br />
            Clearer possibilities.
          </h1>
          <p>
            A thoughtful space to build conversations, understand people, and shape what comes next.
          </p>
        </div>
        <p className="small">Built for eligibility. Ready for wherever you take it.</p>
      </section>
      <section className="login-panel">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h2>Welcome back.</h2>
          <p className="muted">Sign in to create something worth answering.</p>
          <LoginForm />
          <p className="small muted">Need access? Ask your workspace administrator.</p>
        </div>
      </section>
    </main>
  )
}
