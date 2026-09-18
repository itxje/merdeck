import type { AgentModel } from '../../shared/contracts'
import type { AgentProviderAdapter, AgentProviderContext, AgentProviderProbeContext, AgentProviderSession } from './types'
import { agentModelIdSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { opaqueId, providerPath, safeLabel } from './paths'
import { boundedText, drain, readJsonLines, record, spawnProvider, terminate, writeJsonLine } from './process'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface PendingApproval {
  requestId: string | number
}

class CodexSession implements AgentProviderSession {
  private readonly process: Bun.PipedSubprocess
  private readonly requests = new Map<string, PendingRequest>()
  private readonly approvals = new Map<string, PendingApproval>()
  private requestId = 0
  private threadId = ''
  private turnId = ''
  private turnGeneration = 0
  private startingTurn = false
  private readonly completedBeforeStart = new Map<string, unknown>()
  private readonly ignoredTurnIds = new Set<string>()
  private closed = false
  private failed = false

  private constructor(private readonly context: AgentProviderContext) {
    this.process = spawnProvider(context.executable, ['app-server', '--listen', 'stdio://'], context.projectRoot)
    void drain(this.process.stderr)
    void readJsonLines(this.process.stdout, value => this.receive(value)).then(
      () => this.providerFailed(),
      () => this.providerFailed(),
    )
    void this.process.exited.then(() => this.providerFailed())
  }

  static async open(context: AgentProviderContext): Promise<CodexSession> {
    const session = new CodexSession(context)
    try {
      await session.initialize()
      const started = record(await session.request('thread/start', {
        ...(context.model ? { model: context.model } : {}),
        cwd: context.projectRoot,
        approvalPolicy: 'on-request',
        approvalsReviewer: 'user',
        sandbox: 'workspace-write',
        ephemeral: true,
        developerInstructions: 'Edit only files inside the current project. Do not access the network or request additional writable roots.',
      }))
      const thread = record(started?.thread)
      const threadId = boundedText(thread?.id, 200)
      if (!threadId)
        throw new Error('Unsupported thread response')
      session.threadId = threadId
      return session
    }
    catch {
      await session.close()
      throw new AppError('unavailable')
    }
  }

  static async models(context: AgentProviderProbeContext): Promise<AgentModel[]> {
    const session = new CodexSession({ ...context, model: undefined, emit: () => {} })
    try {
      await session.initialize()
      const response = record(await session.request('model/list', { limit: 100, includeHidden: false }))
      if (!Array.isArray(response?.data))
        throw new Error('Unsupported model response')
      const models: AgentModel[] = []
      for (const raw of response.data.slice(0, 100)) {
        const item = record(raw)
        const id = boundedText(item?.model, 100)
        if (!id || !agentModelIdSchema.safeParse(id).success || item?.hidden === true)
          continue
        models.push({
          id,
          label: safeLabel(item?.displayName, id, 100),
          description: safeLabel(item?.description, '', 300),
          isDefault: item?.isDefault === true,
        })
      }
      if (!models.length)
        throw new Error('Empty model response')
      return models
    }
    finally {
      await session.close()
    }
  }

  async startTurn(prompt: string): Promise<void> {
    if (this.closed || this.failed || !this.threadId)
      throw new AppError('unavailable')
    if (this.turnId || this.startingTurn)
      throw new AppError('conflict')
    const generation = ++this.turnGeneration
    this.startingTurn = true
    try {
      const response = record(await this.request('turn/start', {
        threadId: this.threadId,
        ...(this.context.model ? { model: this.context.model } : {}),
        input: [{ type: 'text', text: prompt, text_elements: [] }],
        cwd: this.context.projectRoot,
        approvalPolicy: 'on-request',
        approvalsReviewer: 'user',
        sandboxPolicy: {
          type: 'workspaceWrite',
          writableRoots: [this.context.projectRoot],
          networkAccess: false,
          excludeTmpdirEnvVar: true,
          excludeSlashTmp: true,
        },
      }))
      const turn = record(response?.turn)
      const turnId = boundedText(turn?.id, 200)
      if (!turnId)
        throw new AppError('unavailable')
      if (generation !== this.turnGeneration) {
        await this.request('turn/interrupt', { threadId: this.threadId, turnId }).catch(() => undefined)
        return
      }
      const completedEarly = this.completedBeforeStart.has(turnId)
      const earlyStatus = this.completedBeforeStart.get(turnId)
      this.completedBeforeStart.clear()
      if (completedEarly) {
        this.ignoreTurn(turnId)
        this.finishTurn(earlyStatus)
      }
      else {
        this.turnId = turnId
      }
    }
    finally {
      if (generation === this.turnGeneration)
        this.startingTurn = false
    }
  }

  async approve(approvalId: string, decision: 'approve' | 'deny'): Promise<void> {
    const pending = this.approvals.get(approvalId)
    if (!pending)
      throw new AppError('not_found')
    this.approvals.delete(approvalId)
    await writeJsonLine(this.process, {
      id: pending.requestId,
      result: { decision: decision === 'approve' ? 'accept' : 'decline' },
    })
  }

  async cancel(): Promise<void> {
    this.turnGeneration++
    this.startingTurn = false
    this.completedBeforeStart.clear()
    if (!this.turnId)
      return
    const turnId = this.turnId
    this.ignoreTurn(turnId)
    this.turnId = ''
    this.approvals.clear()
    await this.request('turn/interrupt', { threadId: this.threadId, turnId }).catch(() => undefined)
  }

  async close(): Promise<void> {
    if (this.closed)
      return
    this.closed = true
    this.turnGeneration++
    this.startingTurn = false
    this.completedBeforeStart.clear()
    this.turnId = ''
    this.approvals.clear()
    for (const pending of this.requests.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Provider closed'))
    }
    this.requests.clear()
    try {
      await this.process.stdin.end()
    }
    catch {
      // The process may already have closed its pipe.
    }
    await terminate(this.process)
  }

  private async request(method: string, params: unknown): Promise<unknown> {
    if (this.closed || this.process.exitCode !== null)
      throw new Error('Provider is unavailable')
    const id = ++this.requestId
    const result = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.requests.delete(String(id))
        reject(new Error('Provider request timed out'))
      }, 10000)
      this.requests.set(String(id), { resolve, reject, timer })
    })
    try {
      await writeJsonLine(this.process, { id, method, params })
    }
    catch (error) {
      const pending = this.requests.get(String(id))
      if (pending) {
        clearTimeout(pending.timer)
        this.requests.delete(String(id))
        pending.reject(error instanceof Error ? error : new Error('Provider write failed'))
      }
    }
    return result
  }

  private notify(method: string): Promise<void> {
    return writeJsonLine(this.process, { method })
  }

  private async initialize(): Promise<void> {
    const initialized = record(await this.request('initialize', {
      clientInfo: { name: 'merdeck', title: 'Merdeck', version: '1' },
      capabilities: { experimentalApi: true, requestAttestation: false },
    }))
    if (!initialized)
      throw new Error('Unsupported initialize response')
    await this.notify('initialized')
  }

  private receive(value: unknown): void {
    const message = record(value)
    if (!message)
      throw new Error('Malformed provider message')
    if ((typeof message.id === 'number' || typeof message.id === 'string') && !message.method) {
      const pending = this.requests.get(String(message.id))
      if (!pending)
        return
      clearTimeout(pending.timer)
      this.requests.delete(String(message.id))
      if (message.error)
        pending.reject(new Error('Provider request failed'))
      else pending.resolve(message.result)
      return
    }
    const method = boundedText(message.method, 200)
    const params = record(message.params)
    if (!method || !params)
      throw new Error('Malformed provider message')
    if (message.id !== undefined) {
      this.approvalRequest(method, message.id, params)
      return
    }
    this.notification(method, params)
  }

  private approvalRequest(method: string, requestId: unknown, params: Record<string, unknown>): void {
    if (typeof requestId !== 'number' && typeof requestId !== 'string')
      throw new Error('Malformed provider request')
    if (method !== 'item/fileChange/requestApproval' && method !== 'item/commandExecution/requestApproval') {
      void writeJsonLine(this.process, { id: requestId, error: { code: -32601, message: 'Unsupported request' } })
      return
    }
    if (!this.matchesTurn(params)) {
      void writeJsonLine(this.process, { id: requestId, result: { decision: 'decline' } })
      return
    }
    // File changes stay inside the writable project root, so they proceed without asking the operator.
    if (method === 'item/fileChange/requestApproval') {
      void writeJsonLine(this.process, { id: requestId, result: { decision: 'accept' } })
      return
    }
    const approvalId = opaqueId()
    this.approvals.set(approvalId, { requestId })
    this.context.emit({ type: 'approval.requested', approvalId, kind: 'command', summary: safeLabel(params.command, 'Allow this command?') })
  }

  private notification(method: string, params: Record<string, unknown>): void {
    if (method === 'item/agentMessage/delta') {
      if (!this.matchesTurn(params))
        return
      const delta = boundedText(params.delta, 64 * 1024)
      if (delta)
        this.context.emit({ type: 'assistant.delta', text: delta })
      return
    }
    if (method === 'item/started') {
      if (!this.matchesTurn(params))
        return
      const item = record(params.item)
      if (item?.type === 'commandExecution')
        this.context.emit({ type: 'tool.started', label: 'Command' })
      else if (item?.type === 'fileChange')
        this.context.emit({ type: 'tool.started', label: 'Edit files' })
      return
    }
    if (method === 'item/fileChange/patchUpdated') {
      if (!this.matchesTurn(params))
        return
      this.fileChanges(params.changes)
      return
    }
    if (method === 'item/completed') {
      if (!this.matchesTurn(params))
        return
      const item = record(params.item)
      if (item?.type === 'fileChange')
        this.fileChanges(item.changes)
      return
    }
    if (method === 'turn/completed') {
      if (boundedText(params.threadId, 200) !== this.threadId)
        return
      const turn = record(params.turn)
      const completedId = boundedText(turn?.id, 200)
      const status = turn?.status
      if (!completedId)
        return
      if (this.ignoredTurnIds.has(completedId))
        return
      if (this.turnId === completedId) {
        this.turnId = ''
        this.ignoreTurn(completedId)
      }
      else if (this.startingTurn) {
        this.completedBeforeStart.set(completedId, status)
        while (this.completedBeforeStart.size > 32)
          this.completedBeforeStart.delete(this.completedBeforeStart.keys().next().value!)
        return
      }
      else {
        return
      }
      this.finishTurn(status)
      return
    }
    if (method === 'error' && this.turnId) {
      this.ignoreTurn(this.turnId)
      this.turnId = ''
      this.approvals.clear()
      this.context.emit({ type: 'turn.failed', message: 'The provider could not complete the turn.' })
    }
  }

  private fileChanges(value: unknown): void {
    if (!Array.isArray(value))
      return
    for (const raw of value.slice(0, 128)) {
      const change = record(raw)
      const path = providerPath(this.context.projectRoot, change?.path)
      const kind = record(change?.kind)?.type
      if (path && (kind === 'add' || kind === 'update' || kind === 'delete'))
        this.context.emit({ type: 'file.changed', path, change: kind })
    }
  }

  private matchesTurn(params: Record<string, unknown>): boolean {
    const threadId = boundedText(params.threadId, 200)
    const turnId = boundedText(params.turnId, 200)
    if (!threadId || threadId !== this.threadId || !turnId || this.ignoredTurnIds.has(turnId))
      return false
    return this.turnId ? turnId === this.turnId : this.startingTurn
  }

  private ignoreTurn(turnId: string): void {
    this.ignoredTurnIds.add(turnId)
    while (this.ignoredTurnIds.size > 32)
      this.ignoredTurnIds.delete(this.ignoredTurnIds.values().next().value!)
  }

  private finishTurn(status: unknown): void {
    this.approvals.clear()
    if (status === 'completed')
      this.context.emit({ type: 'turn.completed' })
    else if (status === 'interrupted')
      this.context.emit({ type: 'turn.failed', message: 'The turn was stopped.' })
    else this.context.emit({ type: 'turn.failed', message: 'The provider could not complete the turn.' })
  }

  private providerFailed(): void {
    if (this.closed || this.failed)
      return
    this.failed = true
    this.turnGeneration++
    this.startingTurn = false
    this.completedBeforeStart.clear()
    const active = !!this.turnId
    this.turnId = ''
    this.approvals.clear()
    for (const pending of this.requests.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Provider process failed'))
    }
    this.requests.clear()
    this.context.emit({ type: 'provider.unavailable', message: active ? 'The provider became unavailable.' : 'The provider is unavailable.' })
  }
}

export const codexAdapter: AgentProviderAdapter = {
  id: 'codex',
  label: 'Codex',
  models: CodexSession.models,
  open: CodexSession.open,
}
