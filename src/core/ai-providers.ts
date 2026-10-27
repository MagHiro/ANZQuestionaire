export const aiProviders = [
  { name: 'OpenAI', url: 'https://api.openai.com/v1' },
  { name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { name: 'xAI', url: 'https://api.x.ai/v1' },
  { name: 'Groq', url: 'https://api.groq.com/openai/v1' },
  { name: 'Mistral', url: 'https://api.mistral.ai/v1' },
  { name: 'Together AI', url: 'https://api.together.xyz/v1' },
] as const

export type AiModel = { id: string; name: string; thinkingLevels: string[] }

// Only expose controls with a known Chat Completions wire format. Other
// providers/models retain their own default reasoning behavior.
export function thinkingLevels(baseUrl: string, model: string, supported: string[] = []) {
  const host = new URL(baseUrl).hostname
  if (host === 'api.openai.com') {
    if (/^gpt-5(?:\.|-|$)/.test(model) && !/chat|pro/.test(model)) return ['low', 'medium', 'high']
    if (/^o[134](?:-|$)/.test(model) && !model.includes('pro')) return ['low', 'medium', 'high']
  }
  if (host === 'openrouter.ai' && supported.includes('reasoning')) return ['low', 'medium', 'high']
  return []
}

export function reasoningParameters(baseUrl: string, effort: string) {
  return new URL(baseUrl).hostname === 'openrouter.ai'
    ? { reasoning: { effort } }
    : { reasoning_effort: effort }
}
