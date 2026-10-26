'use client'
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="error-boundary">
      <span className="eyebrow">LET’S TRY THAT AGAIN</span>
      <h1>Something got in the way.</h1>
      <p className="muted">
        We couldn’t load this page. Please try again, or contact your administrator if the problem
        continues.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  )
}
