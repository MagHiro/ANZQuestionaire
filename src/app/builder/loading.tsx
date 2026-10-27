import { Spinner } from '@/components/Spinner'

export default function BuilderLoading() {
  return (
    <main className="route-feedback" role="status" aria-live="polite">
      <Spinner />
      <span>Loading…</span>
    </main>
  )
}
