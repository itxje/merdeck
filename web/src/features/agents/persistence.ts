import type { AgentProvider } from '../../../../src/shared/contracts'
import type { AgentChatItem, AgentChatState } from './state'
import { validPath } from '@/features/workspace/api'
import { initialAgentChatState } from './state'

// A reload drops every in-memory panel state, so one tab keeps its own transcript and conversation handle.
// Session storage is per tab and never holds a session cookie, CSRF token or provider credential.
const storageKey = 'merdeck-agent-session'
const providers = ['codex', 'claude', 'agy'] as const satisfies readonly AgentProvider[]
const changes = ['add', 'update', 'delete'] as const
const opaqueId = /^[a-f0-9]{48}$/

export interface AgentConversationHandle {
  id: string
  provider: AgentProvider
  model: string
}

export interface AgentSelection {
  provider: AgentProvider
  model: string
}

export interface StoredAgentSession {
  conversation: AgentConversationHandle | null
  selection: AgentSelection | null
  state: AgentChatState
}

export const emptyAgentSession: StoredAgentSession = { conversation: null, selection: null, state: initialAgentChatState }

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}
function text(value: unknown, maximum: number): string | undefined {
  return typeof value === 'string' && !!value && value.length <= maximum ? value : undefined
}
function member<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? value as T : undefined
}

function handle(value: unknown): AgentConversationHandle | null {
  const item = record(value)
  const id = text(item?.id, 48)
  const provider = member(item?.provider, providers)
  const model = text(item?.model, 100)
  return id && opaqueId.test(id) && provider && model ? { id, provider, model } : null
}

function selection(value: unknown): AgentSelection | null {
  const item = record(value)
  const provider = member(item?.provider, providers)
  const model = text(item?.model, 100)
  return provider && model ? { provider, model } : null
}

function item(value: unknown): AgentChatItem | undefined {
  const stored = record(value)
  const key = text(stored?.key, 200)
  if (!key)
    return undefined
  if (stored?.kind === 'user' || stored?.kind === 'assistant' || stored?.kind === 'error') {
    const body = text(stored.text, 64 * 1024)
    return body === undefined ? undefined : { key, kind: stored.kind, text: body }
  }
  if (stored?.kind === 'tool') {
    const label = text(stored.label, 500)
    return label === undefined ? undefined : { key, kind: 'tool', label }
  }
  if (stored?.kind === 'file') {
    const change = member(stored.change, changes)
    return validPath(stored.path) && change ? { key, kind: 'file', path: stored.path, change } : undefined
  }
  // Any other kind is unknown, including an approval a tab stored before approvals were removed;
  // the caller discards the whole stored transcript rather than restoring part of one.
  return undefined
}

export function readAgentSession(): StoredAgentSession {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw)
      return emptyAgentSession
    const stored = record(JSON.parse(raw) as unknown)
    const state = record(stored?.state)
    const lastEventId = state?.lastEventId
    if (!stored || !state || typeof lastEventId !== 'number' || !Number.isSafeInteger(lastEventId) || lastEventId < 0 || !Array.isArray(state.items))
      return emptyAgentSession
    const items: AgentChatItem[] = []
    for (const raw of state.items.slice(-200)) {
      const restored = item(raw)
      if (!restored)
        return emptyAgentSession
      items.push(restored)
    }
    // A turn cannot survive a reload, so the panel always restores idle.
    return { conversation: handle(stored.conversation), selection: selection(stored.selection), state: { active: false, lastEventId, items } }
  }
  catch {
    return emptyAgentSession
  }
}

export function writeAgentSession(session: StoredAgentSession): void {
  try {
    if (!session.conversation && !session.selection && !session.state.items.length)
      sessionStorage.removeItem(storageKey)
    else sessionStorage.setItem(storageKey, JSON.stringify(session))
  }
  catch {
    // A full or unavailable store only costs the restore; the panel keeps working in memory.
  }
}
