import Link from 'next/link'
export default function NotFound() {
  return (
    <main className="error-boundary">
      <span className="eyebrow">NOT HERE, NOT YET</span>
      <h1>This questionnaire isn’t available.</h1>
      <p className="muted">
        It may not be published, or the link may have changed. Check with the person who shared it.
      </p>
      <Link href="/" className="button primary">
        Go to workspace
      </Link>
    </main>
  )
}
