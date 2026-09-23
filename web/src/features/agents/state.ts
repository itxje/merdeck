import type { AgentEvent } from '../../../../src/shared/contracts'

export type AgentChatItem
  = | { key: string, kind: 'user', text: string }
    | { key: string, kind: 'assistant', text: string }
    | { key: string, kind: 'tool', label: string }
    | { key: string, kind: 'file', path: string, change: 'add' | 'update' | 'delete' }
    | { key: string, kind: 'error', text: string }

export interface AgentChatState {
  active: boolean
  lastEventId: number
  items: AgentChatItem[]
}

export type AgentChatAction
  = | { type: 'starting', prompt: string }
    | { type: 'conversation.reset' }
    | { type: 'conversation.cleared' }
    | { type: 'event', event: AgentEvent }
    | { type: 'error', message: string, stop?: boolean }

export const initialAgentChatState: AgentChatState = { active: false, lastEventId: 0, items: [] }

function append(items: AgentChatItem[], item: AgentChatItem): AgentChatItem[] {
  return [...items.slice(-199), item]
}

export function agentChatReducer(state: AgentChatState, action: AgentChatAction): AgentChatState {
  if (action.type === 'conversation.reset')
    return { ...state, active: false, lastEventId: 0 }
  if (action.type === 'conversation.cleared')
    return initialAgentChatState
  if (action.type === 'starting')
    return { ...state, active: true, items: append(state.items, { key: `user:${Date.now()}:${state.items.length}`, kind: 'user', text: action.prompt }) }
  if (action.type === 'error')
    return { ...state, active: action.stop ? false : state.active, items: append(state.items, { key: `error:${Date.now()}:${state.items.length}`, kind: 'error', text: action.message }) }
  const event = action.event
  if (event.id <= state.lastEventId)
    return state
  const base = { ...state, lastEventId: event.id }
  if (event.type === 'conversation.started')
    return base
  if (event.type === 'turn.started')
    return { ...base, active: true }
  if (event.type === 'assistant.delta') {
    const last = base.items.at(-1)
    if (last?.kind === 'assistant')
      return { ...base, items: [...base.items.slice(0, -1), { ...last, text: `${last.text}${event.text}` }] }
    return { ...base, items: append(base.items, { key: `event:${event.id}`, kind: 'assistant', text: event.text }) }
  }
  if (event.type === 'tool.started')
    return { ...base, items: append(base.items, { key: `event:${event.id}`, kind: 'tool', label: event.label }) }
  if (event.type === 'file.changed')
    return { ...base, items: append(base.items, { key: `event:${event.id}`, kind: 'file', path: event.path, change: event.change }) }
  if (event.type === 'turn.completed')
    return { ...base, active: false }
  return { ...base, active: false, items: append(base.items, { key: `event:${event.id}`, kind: 'error', text: event.message }) }
}
