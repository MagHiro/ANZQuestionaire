'use client'
import { useState } from 'react'
import { saveAiSettings, testAiConnection } from './actions'
export function AiSettingsForm({
  baseUrl,
  model,
  hasKey,
  source,
}: {
  baseUrl: string
  model: string
  hasKey: boolean
  source: string
}) {
  const [url, setUrl] = useState(baseUrl)
  const [modelId, setModel] = useState(model)
  const [key, setKey] = useState('')
  const [configured, setConfigured] = useState(hasKey)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setMessage('')
        try {
          const result = await saveAiSettings({ baseUrl: url, model: modelId, apiKey: key })
          if (result.error) setMessage(result.error)
          else {
            setKey('')
            setConfigured(true)
            setDirty(false)
            setMessage('AI settings saved. New requests will use this configuration immediately.')
          }
        } catch {
          setMessage('Unable to save. Please try again.')
        } finally {
          setBusy(false)
        }
      }}
    >
      <label>
        API base URL
        <input
          type="url"
          required
          value={url}
          maxLength={1000}
          placeholder="https://api.openai.com/v1"
          onChange={(e) => {
            setUrl(e.target.value)
            setDirty(true)
          }}
        />
      </label>
      <label>
        Model ID
        <input
          required
          value={modelId}
          maxLength={200}
          placeholder="Exact model ID from your provider"
          onChange={(e) => {
            setModel(e.target.value)
            setDirty(true)
          }}
        />
      </label>
      <label>
        API key
        <input
          type="password"
          autoComplete="new-password"
          value={key}
          maxLength={8000}
          placeholder={
            configured ? 'Key configured · leave blank to keep it' : 'Enter your provider API key'
          }
          onChange={(e) => {
            setKey(e.target.value)
            setDirty(true)
          }}
        />
      </label>
      <p className="small muted">
        The key is stored encrypted and is never displayed again. Leaving it blank preserves the
        current key.{' '}
        {source === 'environment'
          ? 'Server environment values are used until you save an admin configuration.'
          : 'Admin settings override the server environment.'}
      </p>
      <div className="button-row">
        <button className="button primary" disabled={busy}>
          Save AI settings
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy || dirty || !configured}
          onClick={async () => {
            setBusy(true)
            setMessage('')
            try {
              const result = await testAiConnection()
              setMessage(
                result.error ||
                  'Connection successful. The provider accepted the configured model and JSON-mode request.',
              )
            } catch {
              setMessage('Connection test failed. Please try again.')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Please wait…' : 'Test saved connection'}
        </button>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </form>
  )
}
