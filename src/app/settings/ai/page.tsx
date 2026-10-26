import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireStaff } from '@/server/auth'
import { getAiConfiguration } from '@/server/ai-settings'
import { AiSettingsForm } from './AiSettingsForm'
export default async function AiSettingsPage() {
  await requireStaff(true)
  const config = await getAiConfiguration()
  return (
    <main className="results-main">
      <Link className="text-button" href="/">
        <ArrowLeft size={15} />
        Back to workspace
      </Link>
      <section className="content-panel stack">
        <span className="eyebrow">WORKSPACE SETTINGS</span>
        <h1>Your AI, your choice.</h1>
        <p className="muted">
          Connect an OpenAI-compatible provider for questionnaire creation and editing. Changes
          apply immediately to the whole workspace.
        </p>
        <AiSettingsForm
          baseUrl={config.baseUrl}
          model={config.model}
          hasKey={Boolean(config.apiKey)}
          source={config.source}
        />
        <p className="small muted">
          Questionnaire definitions and staff instructions are sent to this provider—not respondent
          answers. Use a trusted provider and review its privacy terms. A connection test may incur
          a small provider charge.
        </p>
      </section>
    </main>
  )
}
