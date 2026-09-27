import type { AgentModel } from '../../shared/contracts'
import type { AgentProviderAdapter, AgentProviderContext, AgentProviderProbeContext, AgentProviderSession } from './types'
import { agentModelIdSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { opaqueId, providerPath, safeLabel } from './paths'
import { boundedText, drain, readJsonLines, record, spawnProvider, terminate, writeJsonLine } from './process'

interface ClaudeRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const allowedTools = new Set(['Read', 'Edit', 'Write', 'Glob', 'Grep'])
const fileTools = [...allowedTools].join(',')
const changingTools = new Set(['Edit', 'Write'])
const pathRequiredTools = new Set(['Read', 'Edit', 'Write'])
// Git metadata and agent configuration change what runs next, not the project's documents, so they stay
// closed to writes whatever a provider build chooses to flag.
const protectedSegments = new Set(['.git', '.claude'])

class ClaudeSession implements AgentProviderSession {
  private readonly process: Bun.PipedSubprocess
  private readonly requests = new Map<string, ClaudeRequest>()
  private readonly changedTools = new Map<string, { path: ReturnType<typeof providerPath>, change: 'add' | 'update' }>()
  private turnActive = false
  private sawDelta = false
  private closed = false
  private failed = false

  private constructor(private readonly context: AgentProviderContext) {
    this.process = spawnProvider(context.executable, [
      '-p',
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--include-partial-messages',
      '--permission-prompts',
      'host',
      '--permission-mode',
      'manual',
      '--restricted',
      '--safe-mode',
      '--strict-mcp-config',
      '--tools',
      fileTools,
      // `--permission-prompts host` only chooses who answers; this installs the handler, so every write is
      // decided by `permissionRequest` below. The file tools must not be pre-approved: a pre-approved tool
      // never asks, which would leave `--restricted` as the only boundary.
      '--permission-prompt-tool',
      'stdio',
      '--no-session-persistence',
      '--verbose',
      ...(context.model ? [`--model=${context.model}`] : []),
      '--append-system-prompt',
      'Work only inside the current project. Do not run commands, access the network, or modify settings, Git metadata, tools, hooks, or agent configuration.',
    ], context.projectRoot)
    void drain(this.process.stderr)
    void readJsonLines(this.process.stdout, value => this.receive(value)).then(
      () => this.providerFailed(),
      () => this.providerFailed(),
    )
    void this.process.exited.then(() => this.providerFailed())
  }

  static async open(context: AgentProviderContext): Promise<ClaudeSession> {
    const session = new ClaudeSession(context)
    try {
      await session.initialize()
      return session
    }
    catch {
      await session.close()
      throw new AppError('unavailable')
    }
  }

  static async models(context: AgentProviderProbeContext): Promise<AgentModel[]> {
    const session = new ClaudeSession({ ...context, model: undefined, emit: () => {} })
    try {
      const initialized = await session.initialize()
      if (!Array.isArray(initialized.models))
        throw new Error('Unsupported model response')
      const models: AgentModel[] = []
      for (const raw of initialized.models.slice(0, 100)) {
        const item = record(raw)
        const id = boundedText(item?.value, 100)
        if (!id || !agentModelIdSchema.safeParse(id).success)
          continue
        models.push({
          id,
          label: safeLabel(item?.displayName, id, 100),
          description: safeLabel(item?.description, '', 300),
          isDefault: id === 'default',
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
    if (this.closed || this.failed || this.process.exitCode !== null)
      throw new AppError('unavailable')
    if (this.turnActive)
      throw new AppError('conflict')
    this.turnActive = true
    this.sawDelta = false
    this.changedTools.clear()
    try {
      await writeJsonLine(this.process, {
        type: 'user',
        message: { role: 'user', content: [{ type: 'text', text: prompt }] },
        parent_tool_use_id: null,
      })
    }
    catch {
      this.turnActive = false
      throw new AppError('unavailable')
    }
  }

  async cancel(): Promise<void> {
    if (!this.turnActive)
      return
    this.turnActive = false
    this.changedTools.clear()
    await this.control('interrupt').catch(() => undefined)
  }

  async close(): Promise<void> {
    if (this.closed)
      return
    this.closed = true
    this.turnActive = false
    this.changedTools.clear()
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

  private receive(value: unknown): void {
    const message = record(value)
    const type = boundedText(message?.type, 100)
    if (!message || !type)
      throw new Error('Malformed provider message')
    if (type === 'stream_event') {
      this.streamEvent(record(message.event))
      return
    }
    if (type === 'assistant') {
      this.assistantMessage(record(message.message))
      return
    }
    if (type === 'user') {
      this.toolResults(record(message.message))
      return
    }
    if (type === 'control_request') {
      this.permissionRequest(message)
      return
    }
    if (type === 'control_response') {
      this.controlResponse(record(message.response))
      return
    }
    if (type === 'control_cancel_request')
      return
    if (type === 'result') {
      if (!this.turnActive)
        return
      this.turnActive = false
      this.changedTools.clear()
      if (message.is_error === false || message.subtype === 'success')
        this.context.emit({ type: 'turn.completed' })
      else this.context.emit({ type: 'turn.failed', message: 'The provider could not complete the turn.' })
    }
  }

  private streamEvent(event: Record<string, unknown> | undefined): void {
    if (!this.turnActive || event?.type !== 'content_block_delta')
      return
    const delta = record(event.delta)
    const text = delta?.type === 'text_delta' ? boundedText(delta.text, 64 * 1024) : undefined
    if (text) {
      this.sawDelta = true
      this.context.emit({ type: 'assistant.delta', text })
    }
  }

  private assistantMessage(message: Record<string, unknown> | undefined): void {
    if (!this.turnActive || !Array.isArray(message?.content))
      return
    for (const raw of message.content.slice(0, 128)) {
      const block = record(raw)
      if (block?.type === 'text' && !this.sawDelta) {
        const text = boundedText(block.text, 64 * 1024)
        if (text)
          this.context.emit({ type: 'assistant.delta', text })
      }
      if (block?.type !== 'tool_use')
        continue
      const name = boundedText(block.name, 100)
      const id = boundedText(block.id, 200)
      const input = record(block.input)
      if (!name || !allowedTools.has(name))
        continue
      // Naming the target turns an opaque list of tool names into a readable account of the turn.
      const target = input ? providerPath(this.context.projectRoot, input.file_path ?? input.path) : undefined
      const label = safeLabel(name, 'File tool', 100)
      this.context.emit({ type: 'tool.started', label: target ? `${label} ${target}` : label })
      if (id && input && changingTools.has(name)) {
        const path = providerPath(this.context.projectRoot, input.file_path)
        if (path)
          this.changedTools.set(id, { path, change: name === 'Write' ? 'add' : 'update' })
      }
    }
  }

  private toolResults(message: Record<string, unknown> | undefined): void {
    if (!this.turnActive || !Array.isArray(message?.content))
      return
    for (const raw of message.content.slice(0, 128)) {
      const result = record(raw)
      if (result?.type !== 'tool_result')
        continue
      const id = boundedText(result.tool_use_id, 200)
      const changed = id ? this.changedTools.get(id) : undefined
      if (id)
        this.changedTools.delete(id)
      if (changed?.path && result.is_error !== true)
        this.context.emit({ type: 'file.changed', path: changed.path, change: changed.change })
    }
  }

  private permissionRequest(message: Record<string, unknown>): void {
    const providerId = boundedText(message.request_id, 200)
    const request = record(message.request)
    if (!providerId || request?.subtype !== 'can_use_tool')
      throw new Error('Unsupported provider request')
    if (!this.turnActive) {
      void this.permissionResponse(providerId, { behavior: 'deny', message: 'There is no active turn.' })
      return
    }
    const name = boundedText(request.tool_name, 100)
    const input = record(request.input)
    if (!name || !input || !allowedTools.has(name)) {
      void this.permissionResponse(providerId, { behavior: 'deny', message: 'This tool is not available.' })
      return
    }
    const rawPath = input.file_path ?? input.path
    if (pathRequiredTools.has(name) && rawPath === undefined) {
      void this.permissionResponse(providerId, { behavior: 'deny', message: 'This tool requires a project file path.' })
      return
    }
    const path = rawPath === undefined ? undefined : providerPath(this.context.projectRoot, rawPath)
    if (rawPath !== undefined && !path) {
      void this.permissionResponse(providerId, { behavior: 'deny', message: 'The path is outside the project.' })
      return
    }
    // A plain in-project edit carries no decision reason; the provider attaches one when its own checks
    // single the request out (a sensitive file, a path outside the working directory), and none of those
    // is overridden here.
    const flagged = request.decision_reason_type !== undefined && request.decision_reason_type !== null
    if (flagged || (changingTools.has(name) && path?.split('/').some(segment => protectedSegments.has(segment)))) {
      void this.permissionResponse(providerId, { behavior: 'deny', message: 'This file is protected.' })
      return
    }
    void this.permissionResponse(providerId, { behavior: 'allow', updatedInput: input })
  }

  private permissionResponse(providerId: string, response: Record<string, unknown>): Promise<void> {
    return writeJsonLine(this.process, {
      type: 'control_response',
      response: { subtype: 'success', request_id: providerId, response },
    })
  }

  private async control(subtype: 'initialize' | 'interrupt'): Promise<unknown> {
    const requestId = opaqueId()
    const result = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.requests.delete(requestId)
        reject(new Error('Provider request timed out'))
      }, 10000)
      this.requests.set(requestId, { resolve, reject, timer })
    })
    try {
      await writeJsonLine(this.process, { type: 'control_request', request_id: requestId, request: { subtype } })
    }
    catch (error) {
      const pending = this.requests.get(requestId)
      if (pending) {
        clearTimeout(pending.timer)
        this.requests.delete(requestId)
        pending.reject(error instanceof Error ? error : new Error('Provider write failed'))
      }
    }
    return result
  }

  private controlResponse(response: Record<string, unknown> | undefined): void {
    const requestId = boundedText(response?.request_id, 200)
    if (!requestId)
      throw new Error('Malformed provider response')
    const pending = this.requests.get(requestId)
    if (!pending)
      return
    clearTimeout(pending.timer)
    this.requests.delete(requestId)
    if (response?.subtype !== 'success')
      pending.reject(new Error('Provider request failed'))
    else pending.resolve(response.response)
  }

  private async initialize(): Promise<Record<string, unknown>> {
    // Spawn errors are synchronous, while immediate flag/configuration failures settle on the next task.
    await Promise.resolve()
    if (this.process.exitCode !== null)
      throw new Error('Provider exited')
    const initialized = record(await this.control('initialize'))
    if (!initialized)
      throw new Error('Unsupported initialize response')
    return initialized
  }

  private providerFailed(): void {
    if (this.closed || this.failed)
      return
    this.failed = true
    const active = this.turnActive
    this.turnActive = false
    this.changedTools.clear()
    for (const pending of this.requests.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Provider process failed'))
    }
    this.requests.clear()
    this.context.emit({ type: 'provider.unavailable', message: active ? 'The provider became unavailable.' : 'The provider is unavailable.' })
  }
}

export const claudeAdapter: AgentProviderAdapter = {
  id: 'claude',
  label: 'Claude Code',
  models: ClaudeSession.models,
  open: ClaudeSession.open,
}
