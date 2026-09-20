import type { AgentCapabilities, AgentConversation, AgentEvent, AgentProvider, AgentTurnContext } from '../../../../src/shared/contracts'
import { validPath } from '@/features/workspace/api'
import { HttpError, requestApi } from '@/shared/lib/http'

function invalid(): never {
  throw new HttpError(502, 'invalid_response', 'The service returned an invalid response.')
}
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : invalid()
}
function text(value: unknown, maximum = Number.MAX_SAFE_INTEGER): string {
  return typeof value === 'string' && value.length <= maximum ? value : invalid()
}
function metadata(value: unknown, maximum: number, required = false): string {
  const result = text(value, maximum)
  // eslint-disable-next-line no-control-regex -- Model metadata is one inert display line.
  if ((required && !result) || /[\u0000-\u001F\u007F]/.test(result) || /[\uD800-\uDFFF]/u.test(result))
    return invalid()
  return result
}
function exact(value: Record<string, unknown>, fields: string[]): void {
  if (Object.keys(value).length !== fields.length || fields.some(field => !(field in value)))
    invalid()
}
// Every provider the service can enable; a capability response may name each one once.
const agentProviders = ['codex', 'claude', 'agy'] as const satisfies readonly AgentProvider[]
function provider(value: unknown): AgentProvider {
  return agentProviders.includes(value as AgentProvider) ? value as AgentProvider : invalid()
}
function modelId(value: unknown): string {
  return typeof value === 'string' && value.length <= 100 && /^[a-z\d][\w.:[\]-]*$/i.test(value) ? value : invalid()
}
function opaqueId(value: unknown): string {
  return typeof value === 'string' && /^[a-f0-9]{48}$/.test(value) ? value : invalid()
}
function eventId(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : invalid()
}

export function decodeAgentCapabilities(value: unknown): AgentCapabilities {
  const item = object(value)
  exact(item, ['enabled', 'providers'])
  if (typeof item.enabled !== 'boolean' || !Array.isArray(item.providers) || item.providers.length > agentProviders.length)
    return invalid()
  const providers = item.providers.map((raw) => {
    const entry = object(raw)
    exact(entry, ['id', 'label', 'models'])
    if (!Array.isArray(entry.models) || !entry.models.length || entry.models.length > 32)
      return invalid()
    const ids = new Set<string>()
    const models = entry.models.map((rawModel) => {
      const model = object(rawModel)
      exact(model, ['id', 'label', 'description', 'isDefault'])
      const id = modelId(model.id)
      if (ids.has(id) || typeof model.isDefault !== 'boolean')
        return invalid()
      ids.add(id)
      return { id, label: metadata(model.label, 100, true), description: metadata(model.description, 300), isDefault: model.isDefault }
    })
    if (models.filter(model => model.isDefault).length !== 1)
      return invalid()
    return { id: provider(entry.id), label: metadata(entry.label, 100, true), models }
  })
  if (new Set(providers.map(entry => entry.id)).size !== providers.length || item.enabled !== (providers.length > 0))
    return invalid()
  return { enabled: item.enabled, providers }
}

export function decodeAgentConversation(value: unknown): AgentConversation {
  const item = object(value)
  exact(item, ['id', 'provider', 'model'])
  return { id: opaqueId(item.id), provider: provider(item.provider), model: modelId(item.model) }
}

export function decodeAgentEvent(value: unknown): AgentEvent {
  const item = object(value)
  const id = eventId(item.id)
  const type = text(item.type, 100)
  if (type === 'conversation.started') {
    exact(item, ['id', 'type', 'conversationId', 'provider'])
    return { id, type, conversationId: opaqueId(item.conversationId), provider: provider(item.provider) }
  }
  if (type === 'turn.started') {
    exact(item, ['id', 'type', 'turnId'])
    return { id, type, turnId: opaqueId(item.turnId) }
  }
  if (type === 'assistant.delta') {
    exact(item, ['id', 'type', 'text'])
    return { id, type, text: text(item.text, 64 * 1024) }
  }
  if (type === 'tool.started') {
    exact(item, ['id', 'type', 'label'])
    return { id, type, label: text(item.label, 100) }
  }
  if (type === 'file.changed') {
    exact(item, ['id', 'type', 'path', 'change'])
    if (!validPath(item.path) || (item.change !== 'add' && item.change !== 'update' && item.change !== 'delete'))
      return invalid()
    return { id, type, path: item.path, change: item.change }
  }
  if (type === 'turn.completed') {
    exact(item, ['id', 'type'])
    return { id, type }
  }
  if (type === 'turn.failed' || type === 'provider.unavailable') {
    exact(item, ['id', 'type', 'message'])
    return { id, type, message: text(item.message, 500) }
  }
  return invalid()
}

function accepted(value: unknown): { accepted: true } {
  const item = object(value)
  exact(item, ['accepted'])
  return item.accepted === true ? { accepted: true } : invalid()
}

function cancelled(value: unknown): { cancelled: boolean } {
  const item = object(value)
  exact(item, ['cancelled'])
  return typeof item.cancelled === 'boolean' ? { cancelled: item.cancelled } : invalid()
}

export const agentApi = {
  capabilities: (signal?: AbortSignal) => requestApi('/agents/capabilities', decodeAgentCapabilities, signal ? { signal } : {}),
  create: (provider: AgentProvider, model: string, csrfToken?: string) => requestApi('/agents/conversations', decodeAgentConversation, { method: 'POST', body: { provider, model: modelId(model) }, csrfToken }),
  turn: (conversationId: string, prompt: string, context: AgentTurnContext | undefined, csrfToken?: string) => requestApi(`/agents/conversations/${opaqueId(conversationId)}/turns`, accepted, { method: 'POST', body: context ? { prompt, context } : { prompt }, csrfToken }),
  cancel: (conversationId: string, csrfToken?: string) => requestApi(`/agents/conversations/${opaqueId(conversationId)}/cancel`, cancelled, { method: 'POST', body: {}, csrfToken }),
  eventsUrl: (conversationId: string, after: number) => `/api/agents/conversations/${opaqueId(conversationId)}/events?after=${encodeURIComponent(String(after))}`,
}
