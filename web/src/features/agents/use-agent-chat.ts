import type { AgentEvent, AgentProvider } from '../../../../src/shared/contracts'
import type { AgentConversationHandle } from './persistence'
import type { Session } from '@/features/workspace/api'
import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { sessionCsrf, validPath } from '@/features/workspace/api'
import { HttpError } from '@/shared/lib/http'
import { agentApi, decodeAgentEvent } from './api'
import { readAgentSession, writeAgentSession } from './persistence'
import { agentChatReducer } from './state'

const eventTypes: AgentEvent['type'][] = [
  'conversation.started',
  'turn.started',
  'assistant.delta',
  'tool.started',
  'file.changed',
  'approval.requested',
  'turn.completed',
  'turn.failed',
  'provider.unavailable',
]

function message(error: unknown): string {
  return error instanceof HttpError ? error.message : 'The agent service could not be reached.'
}

interface AgentChatOptions {
  session: Session
  open: boolean
  blocked: boolean
  activePath: string | undefined
  onActiveChange: (active: boolean) => void
  onFileChanged: (path: string) => void
  onSettled: () => void
}

export function useAgentChat({ session, open, blocked, activePath, onActiveChange, onFileChanged, onSettled }: AgentChatOptions) {
  const [restored] = React.useState(readAgentSession)
  const [state, dispatch] = React.useReducer(agentChatReducer, restored.state)
  const [provider, setProvider] = React.useState<AgentProvider>(restored.selection?.provider ?? restored.conversation?.provider ?? 'codex')
  const [model, setModel] = React.useState(restored.selection?.model ?? restored.conversation?.model ?? 'default')
  const [conversation, setConversation] = React.useState<AgentConversationHandle | null>(restored.conversation)
  const [pending, setPending] = React.useState(false)
  const [answering, setAnswering] = React.useState<Set<string>>(() => new Set())
  const [connection, setConnection] = React.useState<'idle' | 'connected' | 'reconnecting'>('idle')
  const activeRef = React.useRef(false)
  const lastEventRef = React.useRef(restored.state.lastEventId)
  const csrfToken = sessionCsrf(session)
  const capabilities = useQuery({
    queryKey: ['agents', 'capabilities'],
    queryFn: ({ signal }) => agentApi.capabilities(signal),
    enabled: open || conversation !== null,
    retry: false,
    staleTime: 30000,
  })
  const providers = capabilities.data?.providers ?? []
  const effectiveProvider = providers.some(item => item.id === provider) ? provider : providers[0]?.id
  const providerModels = providers.find(item => item.id === effectiveProvider)?.models ?? []
  const effectiveModel = providerModels.some(item => item.id === model)
    ? model
    : providerModels.find(item => item.isDefault)?.id ?? providerModels[0]?.id
  const setActive = React.useCallback((active: boolean) => {
    activeRef.current = active
    onActiveChange(active)
  }, [onActiveChange])
  const attached = activePath && validPath(activePath) ? activePath : undefined
  const abandonConversation = React.useCallback(() => {
    lastEventRef.current = 0
    setConversation(null)
    setConnection('idle')
    dispatch({ type: 'conversation.reset' })
  }, [])

  React.useEffect(() => {
    if (!conversation)
      return
    const source = new EventSource(agentApi.eventsUrl(conversation.id, lastEventRef.current), { withCredentials: true })
    const receive = (raw: Event) => {
      try {
        const event = decodeAgentEvent(JSON.parse((raw as MessageEvent<string>).data) as unknown)
        lastEventRef.current = Math.max(lastEventRef.current, event.id)
        dispatch({ type: 'event', event })
        if (event.type === 'file.changed')
          onFileChanged(event.path)
        if (event.type === 'turn.started')
          setActive(true)
        if (event.type === 'turn.completed' || event.type === 'turn.failed' || event.type === 'provider.unavailable') {
          setActive(false)
          onSettled()
        }
        if (event.type === 'turn.failed' || event.type === 'provider.unavailable')
          abandonConversation()
      }
      catch {
        dispatch({ type: 'error', message: 'The service sent an invalid agent event.' })
      }
    }
    for (const type of eventTypes)
      source.addEventListener(type, receive)
    const opened = () => setConnection('connected')
    // The browser retries a dropped stream on its own; CLOSED means the service no longer holds this
    // conversation, so the panel settles instead of reporting an endless reconnect.
    const failed = () => {
      if (source.readyState === EventSource.CLOSED)
        abandonConversation()
      else
        setConnection('reconnecting')
    }
    source.addEventListener('open', opened)
    source.addEventListener('error', failed)
    return () => {
      for (const type of eventTypes)
        source.removeEventListener(type, receive)
      source.removeEventListener('open', opened)
      source.removeEventListener('error', failed)
      source.close()
    }
  }, [conversation, onFileChanged, onSettled, setActive, abandonConversation])

  React.useEffect(() => {
    writeAgentSession({ conversation, selection: { provider, model }, state })
  }, [conversation, provider, model, state])

  React.useEffect(() => () => {
    if (activeRef.current)
      onActiveChange(false)
  }, [onActiveChange])

  const send = React.useCallback(async (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed || trimmed.length > 16000 || blocked || pending || activeRef.current || !effectiveProvider || !effectiveModel)
      return false
    setPending(true)
    setActive(true)
    dispatch({ type: 'starting', prompt: trimmed })
    try {
      let target = conversation
      if (!target || target.provider !== effectiveProvider || target.model !== effectiveModel) {
        target = await agentApi.create(effectiveProvider, effectiveModel, csrfToken)
        lastEventRef.current = 0
        setConversation(target)
      }
      await agentApi.turn(target.id, trimmed, attached ? { path: attached } : undefined, csrfToken)
      return true
    }
    catch (error) {
      setActive(false)
      if (error instanceof HttpError && (error.code === 'not_found' || error.code === 'conflict' || error.code === 'unavailable'))
        abandonConversation()
      dispatch({ type: 'error', message: message(error), stop: true })
      onSettled()
      return false
    }
    finally {
      setPending(false)
    }
  }, [blocked, pending, effectiveProvider, effectiveModel, conversation, csrfToken, attached, setActive, onSettled, abandonConversation])

  const cancel = React.useCallback(async () => {
    if (!conversation || !activeRef.current || pending)
      return
    setPending(true)
    try {
      await agentApi.cancel(conversation.id, csrfToken)
      const terminalSeen = !activeRef.current
      setActive(false)
      abandonConversation()
      if (!terminalSeen) {
        dispatch({ type: 'error', message: 'The turn was stopped.', stop: true })
        onSettled()
      }
    }
    catch (error) {
      dispatch({ type: 'error', message: message(error) })
    }
    finally {
      setPending(false)
    }
  }, [conversation, pending, csrfToken, setActive, onSettled, abandonConversation])

  const answer = React.useCallback(async (approvalId: string, decision: 'approve' | 'deny') => {
    if (!conversation || answering.has(approvalId))
      return
    setAnswering(current => new Set(current).add(approvalId))
    try {
      await agentApi.approve(conversation.id, approvalId, decision, csrfToken)
      dispatch({ type: 'approval', approvalId, decision })
    }
    catch (error) {
      dispatch({ type: 'error', message: message(error) })
    }
    finally {
      setAnswering((current) => {
        const next = new Set(current)
        next.delete(approvalId)
        return next
      })
    }
  }, [answering, conversation, csrfToken])

  return {
    ...state,
    active: activeRef.current,
    attached,
    capabilities,
    providers,
    provider: effectiveProvider,
    setProvider,
    models: providerModels,
    model: effectiveModel,
    setModel,
    pending,
    answering,
    connection,
    blocked,
    send,
    cancel,
    answer,
  }
}
