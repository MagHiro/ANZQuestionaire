import Link from 'next/link'
import { ArrowLeft } from '@/components/Icons'
import { requireStaff } from '@/server/auth'
import { getAiConfiguration } from '@/server/ai-settings'
import { AiSettingsForm } from './AiSettingsForm'
import { WorkspaceSidebar } from '@/components/WorkspaceSidebar'
export default async function AiSettingsPage() {
  const staff = await requireStaff(true)
  const config = await getAiConfiguration()
  return (
    <div className="workspace settings-workspace">
      <WorkspaceSidebar staff={staff} active="ai" />
      <main className="settings-page results-main">
        <section className="content-panel stack">
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
            Questionnaire definitions and staff instructions are sent to this provider—not
            respondent answers. Use a trusted provider and review its privacy terms. A connection
            test may incur a small provider charge.
          </p>
        </section>
      </main>
    </div>
  )
}
