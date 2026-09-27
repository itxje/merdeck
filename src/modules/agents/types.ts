import type { AgentEvent, AgentModel, AgentProvider, RelativePath } from '../../shared/contracts'

export type AgentAdapterEvent
  = | { type: 'assistant.delta', text: string }
    | { type: 'tool.started', label: string }
    | { type: 'file.changed', path: RelativePath, change: 'add' | 'update' | 'delete' }
    | { type: 'turn.completed' }
    | { type: 'turn.failed', message: string }
    | { type: 'provider.unavailable', message: string }

export interface AgentProviderSession {
  startTurn: (prompt: string) => Promise<void>
  cancel: () => Promise<void>
  close: () => Promise<void>
}

export interface AgentProviderProbeContext {
  executable: string
  projectRoot: string
}

export interface AgentProviderContext extends AgentProviderProbeContext {
  model: string | undefined
  emit: (event: AgentAdapterEvent) => void
}

export interface AgentProviderAdapter {
  id: AgentProvider
  label: string
  models?: (context: AgentProviderProbeContext) => Promise<AgentModel[]>
  open: (context: AgentProviderContext) => Promise<AgentProviderSession>
}

export type StoredAgentEvent = AgentEvent
