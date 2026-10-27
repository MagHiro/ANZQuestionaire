'use client'
import { Spinner } from '@/components/Spinner'
import { useEffect, useState } from 'react'
import { saveAiSettings, testAiConnection, loadAiModels } from './actions'
import { aiProviders, type AiModel } from '@/core/ai-providers'
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
  const [operation, setOperation] = useState<'save' | 'test'>('save')
  const [failed, setFailed] = useState(false)
  const [message, setMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  const [models, setModels] = useState<AiModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState('')
  const [provider, setProvider] = useState(
    aiProviders.find((item) => item.url === baseUrl)?.name || 'Custom',
  )
  useEffect(() => {
    if (!key && (!configured || url !== baseUrl)) return
    let active = true
    const timer = setTimeout(async () => {
      setLoadingModels(true)
      setModelError('')
      try {
        const result = await loadAiModels({ baseUrl: url, apiKey: key })
        if (!active) return
        setModels(result.models || [])
        setModelError(result.error || '')
      } catch {
        if (active) setModelError('Unable to load models. You can enter a model ID manually.')
      } finally {
        if (active) setLoadingModels(false)
      }
    }, 650)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [url, key, configured, baseUrl])
  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setOperation('save')
        setFailed(false)
        setMessage('')
        try {
          const result = await saveAiSettings({ baseUrl: url, model: modelId, apiKey: key })
          if (result.error) {
            setFailed(true)
            setMessage(result.error)
          } else {
            setKey('')
            setConfigured(true)
            setDirty(false)
            setMessage('AI settings saved. New requests will use this configuration immediately.')
          }
        } catch {
          setFailed(true)
          setMessage('Unable to save. Please try again.')
        } finally {
          setBusy(false)
        }
      }}
    >
      <label>
        Provider
        <select
          aria-label="Provider"
          value={provider}
          onChange={(event) => {
            const name = event.target.value
            setProvider(name)
            setModels([])
            setKey('')
            setConfigured(false)
            setModel('')
            setDirty(true)
            const preset = aiProviders.find((item) => item.name === name)
            if (preset) setUrl(preset.url)
          }}
        >
          {aiProviders.map((item) => (
            <option key={item.name}>{item.name}</option>
          ))}
          <option>Custom</option>
        </select>
      </label>
      {provider === 'Custom' && (
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
      )}
      <label>
        Model ID
        {models.length > 0 ? (
          <select
            aria-label="Model ID"
            value={modelId}
            required
            onChange={(event) => {
              setModel(event.target.value)
              setDirty(true)
            }}
          >
            <option value="">Choose a default model</option>
            {modelId && !models.some((item) => item.id === modelId) && (
              <option value={modelId}>{modelId} (saved)</option>
            )}
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : (
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
        )}
      </label>
      {loadingModels && (
        <p className="loading-feedback" role="status">
          <Spinner />
          Loading models…
        </p>
      )}
      {modelError && (
        <p className="error" role="alert">
          {modelError}
        </p>
      )}
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
          {busy && operation === 'save' && <Spinner />}Save AI settings
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy || dirty || !configured}
          onClick={async () => {
            setBusy(true)
            setOperation('test')
            setFailed(false)
            setMessage('')
            try {
              const result = await testAiConnection()
              setFailed(Boolean(result.error))
              setMessage(
                result.error ||
                  'Connection successful. The provider accepted the configured model and JSON-mode request.',
              )
            } catch {
              setFailed(true)
              setMessage('Connection test failed. Please try again.')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy && operation === 'test' && <Spinner />}
          {busy && operation === 'test' ? 'Testing…' : 'Test saved connection'}
        </button>
      </div>
      {message && (
        <p role={failed ? 'alert' : 'status'} className={`notice ${failed ? 'error' : 'success'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
