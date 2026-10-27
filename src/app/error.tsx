'use client'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="route-feedback">
      <div className="stack">
        <h1>Something went wrong</h1>
        <p role="alert">We couldn’t load this view. Please try again.</p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  )
}
