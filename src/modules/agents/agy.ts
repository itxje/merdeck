import type { AgentModel } from '../../shared/contracts'
import type { AgentProviderAdapter, AgentProviderContext, AgentProviderProbeContext, AgentProviderSession } from './types'
import { agentModelIdSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { providerPath, safeLabel } from './paths'
import { boundedText, drain, readJsonLines, record, spawnProvider, terminate, writeJsonLine } from './process'

const modifyingTools = new Set([
  'write_to_file',
  'replace_file_content',
  'multi_replace_file_content',
  'sed_file',
])

class AgySession implements AgentProviderSession {
  private readonly process: Bun.PipedSubprocess
  private turnActive = false
  private closed = false
  private failed = false

  private constructor(private readonly context: AgentProviderContext) {
    this.process = spawnProvider(context.executable, [
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '-p=',
      '--dangerously-skip-permissions',
      ...(context.model ? [`--model=${context.model}`] : []),
    ], context.projectRoot)
    void drain(this.process.stderr)
    void readJsonLines(this.process.stdout, value => this.receive(value)).then(
      () => this.providerFailed(),
      () => this.providerFailed(),
    )
    void this.process.exited.then(() => this.providerFailed())
  }

  static async open(context: AgentProviderContext): Promise<AgySession> {
    return new AgySession(context)
  }

  static async models(context: AgentProviderProbeContext): Promise<AgentModel[]> {
    const proc = spawnProvider(context.executable, ['models'], context.projectRoot)
    const decoder = new TextDecoder('utf-8')
    let output = ''
    void drain(proc.stderr)
    for await (const chunk of proc.stdout) {
      output += decoder.decode(chunk, { stream: true })
    }
    output += decoder.decode()
    const exitCode = await proc.exited
    if (exitCode !== 0)
      throw new Error(`agy models failed with exit code ${exitCode}`)
    const lines = output.split('\n').map(line => line.trim()).filter(Boolean)
    const models: AgentModel[] = []
    for (const [index, line] of lines.entries()) {
      const parts = line.split('\t')
      const id = parts[0]?.trim()
      if (!id || !agentModelIdSchema.safeParse(id).success)
        continue
      const label = parts[1]?.trim() || id
      models.push({
        id,
        label: safeLabel(label, id, 100),
        description: '',
        isDefault: index === 0,
      })
    }
    if (!models.length)
      throw new Error('Empty model response')
    return models
  }

  async startTurn(prompt: string): Promise<void> {
    if (this.closed || this.failed || this.process.exitCode !== null)
      throw new AppError('unavailable')
    if (this.turnActive)
      throw new AppError('conflict')
    this.turnActive = true
    try {
      await writeJsonLine(this.process, {
        event: 'user',
        message: { content: prompt },
      })
    }
    catch {
      this.turnActive = false
      throw new AppError('unavailable')
    }
  }

  async approve(_approvalId: string, _decision: 'approve' | 'deny'): Promise<void> {
    throw new AppError('not_found')
  }

  async cancel(): Promise<void> {
    if (!this.turnActive)
      return
    this.turnActive = false
    await terminate(this.process)
  }

  async close(): Promise<void> {
    if (this.closed)
      return
    this.closed = true
    this.turnActive = false
    try {
      await this.process.stdin.end()
    }
    catch {
      // Stream may already be closed.
    }
    await terminate(this.process)
  }

  private receive(value: unknown): void {
    const message = record(value)
    const event = boundedText(message?.event, 100)
    if (!message || !event)
      return
    if (event === 'init')
      return
    if (event === 'step_update') {
      const update = record(message.step_update)
      if (!update)
        return
      const stepType = boundedText(update.step_type, 100)
      const state = boundedText(update.state, 100)
      if (stepType === 'agent_response') {
        const textDelta = typeof update.text_delta === 'string' ? update.text_delta : undefined
        if (textDelta)
          this.context.emit({ type: 'assistant.delta', text: textDelta })
        return
      }
      if (stepType === 'tool') {
        const toolName = boundedText(update.tool_name, 100) || 'tool'
        if (state === 'ACTIVE') {
          this.context.emit({ type: 'tool.started', label: safeLabel(toolName, 'tool', 100) })
        }
        else if (state === 'DONE') {
          const toolInfo = record(update.tool_info)
          const parameters = record(toolInfo?.parameters)
          const targetFile = parameters?.TargetFile || parameters?.target_file || parameters?.path || parameters?.Path
          const path = providerPath(this.context.projectRoot, targetFile)
          if (path && modifyingTools.has(toolName)) {
            this.context.emit({ type: 'file.changed', path, change: 'update' })
          }
        }
        return
      }
      return
    }
    if (event === 'result') {
      this.turnActive = false
      const result = record(message.result)
      const status = boundedText(result?.status, 50)
      if (status === 'SUCCESS') {
        this.context.emit({ type: 'turn.completed' })
      }
      else {
        const errorMsg = boundedText(result?.error, 500) || 'Turn failed'
        this.context.emit({ type: 'turn.failed', message: errorMsg })
      }
    }
  }

  private providerFailed(): void {
    if (this.failed || this.closed)
      return
    this.failed = true
    if (this.turnActive) {
      this.turnActive = false
      this.context.emit({ type: 'turn.failed', message: 'The provider connection closed.' })
    }
    this.context.emit({ type: 'provider.unavailable', message: 'The provider process exited unexpectedly.' })
  }
}

export const agyAdapter: AgentProviderAdapter = {
  id: 'agy',
  label: 'Antigravity',
  models: AgySession.models,
  open: AgySession.open,
}
