import type { AppConfig } from '../../config'
import type { AgentCapabilities, AgentConversation, AgentEvent, AgentModel, AgentProvider, AgentTurnContext } from '../../shared/contracts'
import type { AgentAdapterEvent, AgentProviderAdapter, AgentProviderSession } from './types'
import { Buffer } from 'node:buffer'
import { agentModelIdSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { agyAdapter } from './agy'
import { claudeAdapter } from './claude'
import { codexAdapter } from './codex'
import { opaqueId, safeLabel } from './paths'

export interface AgentPrincipal {
  id: string
  origin: string
  expiresAt: number
}

interface ConfiguredAdapter {
  adapter: AgentProviderAdapter
  executable: string
  modelPromise?: Promise<AgentModel[]>
}
type UnstoredAgentEvent<T = AgentEvent> = T extends AgentEvent ? Omit<T, 'id'> : never

interface EventRecord {
  event: AgentEvent
  bytes: number
}

interface ConversationRecord {
  id: string
  provider: AgentProvider
  model: string
  owner: AgentPrincipal
  session: AgentProviderSession
  events: EventRecord[]
  eventBytes: number
  nextEventId: number
  listeners: Set<(event: AgentEvent | null) => void>
  active: boolean
  turnOutputBytes: number
  turnEventCount: number
  turnTimer?: ReturnType<typeof setTimeout>
  terminalTimer?: ReturnType<typeof setTimeout>
  expiryTimer: ReturnType<typeof setTimeout>
  terminal: boolean
  closed: boolean
}

export interface AgentManagerOptions {
  projectRoot: string
  providers: ConfiguredAdapter[]
  clock?: () => number
  maximumConversations?: number
  maximumActiveTurns?: number
  turnTimeoutMs?: number
  maximumEvents?: number
  maximumEventBytes?: number
  maximumListenersPerConversation?: number
  terminalRetentionMs?: number
}

const labels: Record<AgentProvider, string> = { codex: 'Codex', claude: 'Claude Code', agy: 'Google Antigravity' }
const defaultModels = (): AgentModel[] => [{ id: 'default', label: 'Provider default', description: 'Use the model configured by the provider.', isDefault: true }]

export class AgentManager {
  private readonly providers = new Map<AgentProvider, ConfiguredAdapter>()
  private readonly conversations = new Map<string, ConversationRecord>()
  private readonly clock: () => number
  private readonly maximumConversations: number
  private readonly maximumActiveTurns: number
  private readonly turnTimeoutMs: number
  private readonly maximumEvents: number
  private readonly maximumEventBytes: number
  private readonly maximumListenersPerConversation: number
  private readonly terminalRetentionMs: number
  private opening = 0
  private readonly openingByOwner = new Map<string, number>()
  private activeTurns = 0
  private closed = false

  constructor(private readonly options: AgentManagerOptions) {
    for (const provider of options.providers)
      this.providers.set(provider.adapter.id, provider)
    this.clock = options.clock ?? Date.now
    this.maximumConversations = options.maximumConversations ?? 8
    this.maximumActiveTurns = options.maximumActiveTurns ?? 2
    this.turnTimeoutMs = options.turnTimeoutMs ?? 5 * 60 * 1000
    this.maximumEvents = options.maximumEvents ?? 256
    this.maximumEventBytes = options.maximumEventBytes ?? 1024 * 1024
    this.maximumListenersPerConversation = options.maximumListenersPerConversation ?? 4
    this.terminalRetentionMs = options.terminalRetentionMs ?? 30000
  }

  async capabilities(): Promise<AgentCapabilities> {
    this.available()
    const providers = await Promise.all([...this.providers.values()].map(async configured => ({
      id: configured.adapter.id,
      label: configured.adapter.label,
      models: await this.models(configured),
    })))
    return { enabled: providers.length > 0, providers }
  }

  async create(provider: AgentProvider, model: string, owner: AgentPrincipal): Promise<AgentConversation> {
    this.available()
    const configured = this.providers.get(provider)
    if (!configured)
      throw new AppError('unsupported')
    if (owner.expiresAt <= this.clock())
      throw new AppError('unauthorized')
    const models = await this.models(configured)
    this.available()
    if (owner.expiresAt <= this.clock())
      throw new AppError('unauthorized')
    if (!models.some(candidate => candidate.id === model))
      throw new AppError('invalid_request')
    const ownerKey = this.ownerKey(owner)
    const owned = [...this.conversations.values()].filter(item => this.sameOwner(item, owner)).length
    if (this.conversations.size + this.opening >= this.maximumConversations || owned + (this.openingByOwner.get(ownerKey) ?? 0) >= 4)
      throw new AppError('rate_limited')
    this.opening++
    this.openingByOwner.set(ownerKey, (this.openingByOwner.get(ownerKey) ?? 0) + 1)
    const id = opaqueId()
    const early: AgentAdapterEvent[] = []
    let record: ConversationRecord | undefined
    try {
      const session = await configured.adapter.open({
        executable: configured.executable,
        projectRoot: this.options.projectRoot,
        model: model === 'default' ? undefined : model,
        emit: (event) => {
          if (record)
            this.receive(record, event)
          else early.push(event)
        },
      })
      if (this.closed || owner.expiresAt <= this.clock()) {
        await session.close().catch(() => undefined)
        throw new AppError(this.closed ? 'unavailable' : 'unauthorized')
      }
      const delay = Math.max(0, owner.expiresAt - this.clock())
      const expiryTimer = setTimeout(() => void this.remove(id).catch(() => undefined), delay)
      record = {
        id,
        provider,
        model,
        owner: { ...owner },
        session,
        events: [],
        eventBytes: 0,
        nextEventId: 1,
        listeners: new Set(),
        active: false,
        turnOutputBytes: 0,
        turnEventCount: 0,
        expiryTimer,
        terminal: false,
        closed: false,
      }
      this.conversations.set(id, record)
      this.append(record, { type: 'conversation.started', conversationId: id, provider })
      for (const event of early)
        this.receive(record, event)
      return { id, provider, model }
    }
    catch (error) {
      if (error instanceof AppError)
        throw error
      throw new AppError('unavailable')
    }
    finally {
      this.opening--
      const remaining = (this.openingByOwner.get(ownerKey) ?? 1) - 1
      if (remaining)
        this.openingByOwner.set(ownerKey, remaining)
      else this.openingByOwner.delete(ownerKey)
    }
  }

  async startTurn(id: string, owner: AgentPrincipal, prompt: string, context?: AgentTurnContext): Promise<{ accepted: true }> {
    const conversation = this.owned(id, owner)
    if (conversation.terminal)
      throw new AppError('unavailable')
    if (conversation.active)
      throw new AppError('conflict')
    if (this.activeTurns >= this.maximumActiveTurns)
      throw new AppError('rate_limited')
    conversation.active = true
    conversation.turnOutputBytes = 0
    conversation.turnEventCount = 0
    this.activeTurns++
    this.append(conversation, { type: 'turn.started', turnId: opaqueId() })
    conversation.turnTimer = setTimeout(() => {
      if (!conversation.active)
        return
      void this.stopAndTerminate(conversation, 'The turn timed out.')
    }, this.turnTimeoutMs)
    try {
      // The path is schema-validated, so the service composes the context line the provider sees.
      await conversation.session.startTurn(context ? `Current file: ${context.path}\n\n${prompt}` : prompt)
      if (conversation.terminal)
        throw new AppError('unavailable')
      return { accepted: true }
    }
    catch (error) {
      if (conversation.terminal)
        throw new AppError('unavailable')
      if (error instanceof AppError && error.code === 'conflict') {
        if (conversation.active) {
          this.deactivate(conversation)
          this.append(conversation, { type: 'turn.failed', message: 'The provider could not start the turn.' })
          await this.remove(conversation.id)
        }
        throw error
      }
      if (!conversation.closed) {
        if (conversation.active)
          this.deactivate(conversation)
        this.append(conversation, { type: 'provider.unavailable', message: 'The provider is unavailable.' })
        await this.remove(conversation.id)
      }
      else if (conversation.active) {
        this.deactivate(conversation)
      }
      throw new AppError('unavailable')
    }
  }

  async approve(id: string, owner: AgentPrincipal, approvalId: string, decision: 'approve' | 'deny'): Promise<{ accepted: true }> {
    const conversation = this.owned(id, owner)
    if (conversation.terminal)
      throw new AppError('unavailable')
    if (!conversation.active)
      throw new AppError('conflict')
    await conversation.session.approve(approvalId, decision)
    return { accepted: true }
  }

  async cancel(id: string, owner: AgentPrincipal): Promise<{ cancelled: boolean }> {
    const conversation = this.owned(id, owner)
    if (conversation.terminal || !conversation.active)
      return { cancelled: false }
    await this.stopAndTerminate(conversation, 'The turn was stopped.')
    return { cancelled: true }
  }

  listen(id: string, owner: AgentPrincipal, after: number, listener: (event: AgentEvent | null) => void): { events: AgentEvent[], unsubscribe: () => void } {
    const conversation = this.owned(id, owner)
    const first = conversation.events[0]?.event.id
    if (after > 0 && first !== undefined && first > after + 1)
      throw new AppError('conflict')
    const events = conversation.events.map(item => item.event).filter(event => event.id > after)
    if (conversation.listeners.size >= this.maximumListenersPerConversation)
      throw new AppError('rate_limited')
    conversation.listeners.add(listener)
    return { events, unsubscribe: () => conversation.listeners.delete(listener) }
  }

  async closePrincipal(id: string, origin: string): Promise<void> {
    const matching = [...this.conversations.values()].filter(item => item.owner.id === id && item.owner.origin === origin)
    await Promise.all(matching.map(item => this.remove(item.id)))
  }

  async close(): Promise<void> {
    if (this.closed)
      return
    this.closed = true
    await Promise.all([...this.conversations.keys()].map(id => this.remove(id)))
  }

  private receive(conversation: ConversationRecord, event: AgentAdapterEvent): void {
    if (conversation.closed)
      return
    if (event.type === 'provider.unavailable') {
      if (conversation.active)
        this.deactivate(conversation)
      this.append(conversation, event)
      void this.terminate(conversation).catch(() => undefined)
      return
    }
    if (!conversation.active)
      return
    conversation.turnEventCount++
    conversation.turnOutputBytes += Buffer.byteLength(JSON.stringify(event))
    if (conversation.turnEventCount > this.maximumEvents || conversation.turnOutputBytes > this.maximumEventBytes) {
      void this.stopAndTerminate(conversation, 'The provider output limit was exceeded.')
      return
    }
    if (event.type === 'turn.completed' || event.type === 'turn.failed')
      this.deactivate(conversation)
    this.append(conversation, event)
    if (event.type === 'turn.failed')
      void this.terminate(conversation)
  }

  private append(conversation: ConversationRecord, event: UnstoredAgentEvent): void {
    if (conversation.closed)
      return
    const stored = { ...event, id: conversation.nextEventId++ } as AgentEvent
    const bytes = Buffer.byteLength(JSON.stringify(stored))
    conversation.events.push({ event: stored, bytes })
    conversation.eventBytes += bytes
    while (conversation.events.length > this.maximumEvents || conversation.eventBytes > this.maximumEventBytes) {
      const removed = conversation.events.shift()
      if (removed)
        conversation.eventBytes -= removed.bytes
    }
    for (const listener of conversation.listeners)
      listener(stored)
  }

  private deactivate(conversation: ConversationRecord): void {
    if (!conversation.active)
      return
    conversation.active = false
    this.activeTurns--
    if (conversation.turnTimer)
      clearTimeout(conversation.turnTimer)
    delete conversation.turnTimer
  }

  private async stopAndTerminate(conversation: ConversationRecord, message: string): Promise<void> {
    if (conversation.closed)
      return
    this.deactivate(conversation)
    await conversation.session.cancel().catch(() => undefined)
    if (!conversation.closed)
      this.append(conversation, { type: 'turn.failed', message })
    await this.terminate(conversation)
  }

  private owned(id: string, owner: AgentPrincipal): ConversationRecord {
    this.available()
    const conversation = this.conversations.get(id)
    if (!conversation || conversation.closed || !this.sameOwner(conversation, owner))
      throw new AppError('not_found')
    if (owner.expiresAt <= this.clock() || conversation.owner.expiresAt <= this.clock()) {
      void this.remove(id)
      throw new AppError('unauthorized')
    }
    return conversation
  }

  private sameOwner(conversation: ConversationRecord, owner: AgentPrincipal): boolean {
    return conversation.owner.id === owner.id && conversation.owner.origin === owner.origin
  }

  private ownerKey(owner: AgentPrincipal): string {
    return `${owner.id}\n${owner.origin}`
  }

  private models(configured: ConfiguredAdapter): Promise<AgentModel[]> {
    if (!configured.modelPromise) {
      configured.modelPromise = (configured.adapter.models
        ? Promise.resolve().then(() => configured.adapter.models!({ executable: configured.executable, projectRoot: this.options.projectRoot }))
        : Promise.resolve(defaultModels()))
        .then((models) => {
          const safe: AgentModel[] = []
          const ids = new Set<string>()
          for (const model of models.slice(0, 32)) {
            if (!agentModelIdSchema.safeParse(model.id).success || ids.has(model.id))
              continue
            const label = safeLabel(model.label, '', 100)
            const description = safeLabel(model.description, '', 300)
            if (!label)
              continue
            ids.add(model.id)
            safe.push({ id: model.id, label, description, isDefault: model.isDefault === true })
          }
          if (!safe.length)
            return defaultModels()
          const defaultIndex = Math.max(0, safe.findIndex(model => model.isDefault))
          return safe.map((model, index) => ({ ...model, isDefault: index === defaultIndex }))
        }, defaultModels)
    }
    return configured.modelPromise
  }

  private available(): void {
    if (this.closed)
      throw new AppError('unavailable')
  }

  private async remove(id: string): Promise<void> {
    const conversation = this.conversations.get(id)
    if (!conversation || conversation.closed)
      return
    conversation.closed = true
    this.conversations.delete(id)
    if (conversation.active)
      this.deactivate(conversation)
    clearTimeout(conversation.expiryTimer)
    if (conversation.terminalTimer)
      clearTimeout(conversation.terminalTimer)
    for (const listener of conversation.listeners)
      listener(null)
    conversation.listeners.clear()
    await conversation.session.close().catch(() => undefined)
  }

  private async terminate(conversation: ConversationRecord): Promise<void> {
    if (conversation.closed || conversation.terminal)
      return
    conversation.terminal = true
    if (conversation.active)
      this.deactivate(conversation)
    await conversation.session.close().catch(() => undefined)
    if (!conversation.closed) {
      conversation.terminalTimer = setTimeout(() => {
        void this.remove(conversation.id)
      }, this.terminalRetentionMs)
    }
  }
}

export function createAgentManager(config: AppConfig, clock?: () => number): AgentManager {
  const providers: ConfiguredAdapter[] = []
  if (config.agents.codex)
    providers.push({ adapter: codexAdapter, executable: config.agents.codex })
  if (config.agents.claude)
    providers.push({ adapter: claudeAdapter, executable: config.agents.claude })
  if (config.agents.agy)
    providers.push({ adapter: agyAdapter, executable: config.agents.agy })
  return new AgentManager({ projectRoot: config.projectRoot, providers, ...(clock ? { clock } : {}) })
}

export { labels as agentProviderLabels }
