import type { AgentEvent } from '../../shared/contracts'
import type { AgentAdapterEvent, AgentProviderAdapter, AgentProviderContext, AgentProviderSession } from './types'
import { describe, expect, test } from 'bun:test'
import { AppError } from '../../shared/errors'
import { AgentManager, createAgentManager } from './manager'
import { providerEnvironment } from './process'

class FakeSession implements AgentProviderSession {
  prompts: string[] = []
  approvals: Array<[string, 'approve' | 'deny']> = []
  cancelled = 0
  closed = 0

  constructor(readonly emit: (event: AgentAdapterEvent) => void) {}

  async startTurn(prompt: string) {
    this.prompts.push(prompt)
  }

  async approve(id: string, decision: 'approve' | 'deny') {
    this.approvals.push([id, decision])
  }

  async cancel() {
    this.cancelled++
  }

  async close() {
    this.closed++
  }
}

async function waitFor(predicate: () => boolean, timeout = 1000) {
  const end = Date.now() + timeout
  while (!predicate()) {
    if (Date.now() >= end)
      throw new Error('Timed out waiting for agent state')
    await Bun.sleep(5)
  }
}

function fixture(options: Partial<ConstructorParameters<typeof AgentManager>[0]> = {}) {
  const sessions: FakeSession[] = []
  const adapter: AgentProviderAdapter = {
    id: 'codex',
    label: 'Test provider',
    open: async (context: AgentProviderContext) => {
      const session = new FakeSession(context.emit)
      sessions.push(session)
      return session
    },
  }
  const manager = new AgentManager({ projectRoot: '/project', providers: [{ adapter, executable: '/agent' }], ...options })
  const owner = { id: 'owner', origin: 'https://example.test', expiresAt: Date.now() + 60000 }
  return { manager, sessions, owner }
}

describe('agent manager', () => {
  test('does not let a later request extend the stored principal expiry', async () => {
    let now = 1000
    const { manager, owner } = fixture({ clock: () => now })
    const expiring = { ...owner, expiresAt: now + 1000 }
    const conversation = await manager.create('codex', 'default', expiring)
    now += 1001
    expect(() => manager.listen(conversation.id, { ...expiring, expiresAt: now + 1000 }, 0, () => {})).toThrow(AppError)
    await manager.close()
  })

  test('binds conversations to a principal and normalizes a complete turn', async () => {
    const { manager, sessions, owner } = fixture()
    expect(await manager.capabilities()).toEqual({ enabled: true, providers: [{ id: 'codex', label: 'Test provider', models: [{ id: 'default', label: 'Provider default', description: 'Use the model configured by the provider.', isDefault: true }] }] })
    const conversation = await manager.create('codex', 'default', owner)
    expect(conversation).toMatchObject({ provider: 'codex', model: 'default' })
    const received: unknown[] = []
    const subscription = manager.listen(conversation.id, owner, 0, event => received.push(event))
    expect(subscription.events).toMatchObject([{ id: 1, type: 'conversation.started', provider: 'codex' }])

    await manager.startTurn(conversation.id, owner, 'Edit the diagram')
    expect(sessions[0]?.prompts).toEqual(['Edit the diagram'])
    sessions[0]?.emit({ type: 'assistant.delta', text: 'Working' })
    sessions[0]?.emit({ type: 'file.changed', path: 'docs/flow.md', change: 'update' })
    sessions[0]?.emit({ type: 'approval.requested', approvalId: 'a'.repeat(48), kind: 'file_change', summary: 'Allow edit?' })
    await manager.approve(conversation.id, owner, 'a'.repeat(48), 'approve')
    sessions[0]?.emit({ type: 'turn.completed' })

    expect(received).toMatchObject([
      { id: 2, type: 'turn.started' },
      { id: 3, type: 'assistant.delta', text: 'Working' },
      { id: 4, type: 'file.changed', path: 'docs/flow.md' },
      { id: 5, type: 'approval.requested' },
      { id: 6, type: 'turn.completed' },
    ])
    expect(sessions[0]?.approvals).toEqual([['a'.repeat(48), 'approve']])
    await expect(manager.startTurn(conversation.id, { ...owner, id: 'other' }, 'steal')).rejects.toEqual(expect.objectContaining({ code: 'not_found' }))
    subscription.unsubscribe()
    await manager.close()
    expect(sessions[0]?.closed).toBe(1)
  })

  test('discovers models once and refuses engine/model mismatches', async () => {
    let probes = 0
    const opened: Array<string | undefined> = []
    const adapter: AgentProviderAdapter = {
      id: 'codex',
      label: 'Catalog provider',
      models: async () => {
        probes++
        return [
          { id: 'gpt-safe', label: 'GPT Safe', description: 'Safe model', isDefault: true },
          { id: 'gpt-fast', label: 'GPT\nFast', description: 'Fast\rmodel', isDefault: false },
        ]
      },
      open: async (context) => {
        opened.push(context.model)
        return new FakeSession(context.emit)
      },
    }
    const manager = new AgentManager({ projectRoot: '/project', providers: [{ adapter, executable: '/agent' }] })
    const owner = { id: 'owner', origin: 'https://example.test', expiresAt: Date.now() + 60000 }
    const capabilities = await Promise.all([manager.capabilities(), manager.capabilities()])
    expect(capabilities[0].providers[0]?.models).toHaveLength(2)
    expect(capabilities[0].providers[0]?.models[1]).toEqual({ id: 'gpt-fast', label: 'GPT Fast', description: 'Fast model', isDefault: false })
    expect(probes).toBe(1)
    await expect(manager.create('codex', 'claude-opus', owner)).rejects.toEqual(expect.objectContaining({ code: 'invalid_request' }))
    const conversation = await manager.create('codex', 'gpt-fast', owner)
    expect(conversation.model).toBe('gpt-fast')
    expect(opened).toEqual(['gpt-fast'])
    await manager.close()
  })

  test('falls back to one provider-default model when discovery fails synchronously', async () => {
    let probes = 0
    const adapter: AgentProviderAdapter = {
      id: 'codex',
      label: 'Failing catalogue',
      models: () => {
        probes++
        throw new Error('private provider diagnostic')
      },
      open: async context => new FakeSession(context.emit),
    }
    const manager = new AgentManager({ projectRoot: '/project', providers: [{ adapter, executable: '/agent' }] })
    const owner = { id: 'owner', origin: 'https://example.test', expiresAt: Date.now() + 60000 }
    expect(await manager.capabilities()).toEqual({ enabled: true, providers: [{ id: 'codex', label: 'Failing catalogue', models: [{ id: 'default', label: 'Provider default', description: 'Use the model configured by the provider.', isDefault: true }] }] })
    expect((await manager.create('codex', 'default', owner)).model).toBe('default')
    expect(probes).toBe(1)
    await manager.close()
  })

  test('enforces active-turn, capacity, output and cancellation bounds', async () => {
    const { manager, sessions, owner } = fixture({ maximumActiveTurns: 1, maximumEventBytes: 160 })
    const first = await manager.create('codex', 'default', owner)
    const second = await manager.create('codex', 'default', owner)
    await manager.startTurn(first.id, owner, 'one')
    await expect(manager.startTurn(first.id, owner, 'again')).rejects.toEqual(expect.objectContaining({ code: 'conflict' }))
    await expect(manager.startTurn(second.id, owner, 'two')).rejects.toEqual(expect.objectContaining({ code: 'rate_limited' }))
    sessions[0]?.emit({ type: 'assistant.delta', text: 'x'.repeat(200) })
    expect(sessions[0]?.cancelled).toBe(1)
    await manager.startTurn(second.id, owner, 'two')
    expect(await manager.cancel(second.id, owner)).toEqual({ cancelled: true })
    const cancelled = manager.listen(second.id, owner, 0, () => {})
    expect(cancelled.events.at(-1)).toMatchObject({ type: 'turn.failed', message: 'The turn was stopped.' })
    cancelled.unsubscribe()
    expect(sessions[1]?.cancelled).toBe(1)
    expect(sessions[1]?.closed).toBe(1)
    await manager.close()
  })

  test('counts in-flight opens against global and per-principal capacity', async () => {
    const sessions: FakeSession[] = []
    const releases: Array<() => void> = []
    const adapter: AgentProviderAdapter = {
      id: 'codex',
      label: 'Delayed provider',
      open: context => new Promise((resolve) => {
        const session = new FakeSession(context.emit)
        sessions.push(session)
        releases.push(() => resolve(session))
      }),
    }
    const manager = new AgentManager({ projectRoot: '/project', providers: [{ adapter, executable: '/agent' }], maximumConversations: 8 })
    const owner = { id: 'owner', origin: 'https://example.test', expiresAt: Date.now() + 60000 }
    const pending = Array.from({ length: 4 }, () => manager.create('codex', 'default', owner))
    await waitFor(() => releases.length === 4)
    await expect(manager.create('codex', 'default', owner)).rejects.toEqual(expect.objectContaining({ code: 'rate_limited' }))
    releases.splice(0).forEach(release => release())
    await Promise.all(pending)
    await manager.close()
    expect(sessions.every(session => session.closed === 1)).toBe(true)
  })

  test('times out turns, expires sessions and reaps unavailable providers', async () => {
    const { manager, sessions, owner } = fixture({ turnTimeoutMs: 15 })
    const timed = await manager.create('codex', 'default', owner)
    const timedEvents: AgentAdapterEvent[] = []
    manager.listen(timed.id, owner, 0, (event) => {
      if (event)
        timedEvents.push(event as AgentAdapterEvent)
    })
    await manager.startTurn(timed.id, owner, 'wait forever')
    await waitFor(() => timedEvents.some(event => event.type === 'turn.failed'))
    expect(sessions[0]?.cancelled).toBe(1)
    await waitFor(() => sessions[0]?.closed === 1)

    const unavailable = await manager.create('codex', 'default', owner)
    const unavailableEvents: Array<AgentEvent | null> = []
    manager.listen(unavailable.id, owner, 0, event => unavailableEvents.push(event))
    await manager.startTurn(unavailable.id, owner, 'crash')
    sessions[1]?.emit({ type: 'provider.unavailable', message: 'Provider exited.' })
    await waitFor(() => sessions[1]?.closed === 1)
    expect(unavailableEvents).toContainEqual({ id: expect.any(Number), type: 'provider.unavailable', message: 'Provider exited.' })
    const replay = manager.listen(unavailable.id, owner, 0, () => {})
    expect(replay.events.at(-1)).toMatchObject({ type: 'provider.unavailable', message: 'Provider exited.' })
    replay.unsubscribe()

    const expiringOwner = { ...owner, id: 'expiring', expiresAt: Date.now() + 20 }
    const expiring = await manager.create('codex', 'default', expiringOwner)
    await waitFor(() => sessions[2]?.closed === 1)
    expect(() => manager.listen(expiring.id, expiringOwner, 0, () => {})).toThrow(AppError)
    await manager.close()
  })

  test('bounds non-text provider event floods', async () => {
    const { manager, sessions, owner } = fixture({ maximumEvents: 3, maximumEventBytes: 4096 })
    const conversation = await manager.create('codex', 'default', owner)
    const received: AgentAdapterEvent[] = []
    manager.listen(conversation.id, owner, 0, (event) => {
      if (event)
        received.push(event as AgentAdapterEvent)
    })
    await manager.startTurn(conversation.id, owner, 'flood')
    for (let index = 0; index < 4; index++)
      sessions[0]?.emit({ type: 'tool.started', label: `Tool ${index}` })
    await waitFor(() => sessions[0]?.closed === 1)
    expect(sessions[0]?.cancelled).toBe(1)
    expect(received.at(-1)).toMatchObject({ type: 'turn.failed', message: 'The provider output limit was exceeded.' })
    sessions[0]?.emit({ type: 'tool.started', label: 'ignored' })
    expect(received.some(event => event.type === 'tool.started' && event.label === 'ignored')).toBe(false)
    await manager.close()
  })

  test('closes all conversations for a logged-out principal', async () => {
    const { manager, sessions, owner } = fixture()
    const conversation = await manager.create('codex', 'default', owner)
    await manager.closePrincipal(owner.id, owner.origin)
    expect(sessions[0]?.closed).toBe(1)
    expect(() => manager.listen(conversation.id, owner, 0, () => {})).toThrow(AppError)
    await manager.close()
  })

  test('bounds concurrent event listeners per conversation', async () => {
    const { manager, owner } = fixture({ maximumListenersPerConversation: 2 })
    const conversation = await manager.create('codex', 'default', owner)
    const first = manager.listen(conversation.id, owner, 0, () => {})
    const second = manager.listen(conversation.id, owner, 0, () => {})
    expect(() => manager.listen(conversation.id, owner, 0, () => {})).toThrow(AppError)
    first.unsubscribe()
    expect(() => manager.listen(conversation.id, owner, 0, () => {})).not.toThrow()
    second.unsubscribe()
    await manager.close()
  })

  test('retains terminal replay briefly and then releases its capacity', async () => {
    const { manager, sessions, owner } = fixture({ terminalRetentionMs: 20 })
    const conversation = await manager.create('codex', 'default', owner)
    await manager.startTurn(conversation.id, owner, 'fail')
    sessions[0]?.emit({ type: 'turn.failed', message: 'Failed safely.' })
    await waitFor(() => sessions[0]?.closed === 1)
    const replay = manager.listen(conversation.id, owner, 0, () => {})
    expect(replay.events.at(-1)).toMatchObject({ type: 'turn.failed', message: 'Failed safely.' })
    replay.unsubscribe()
    await Bun.sleep(40)
    expect(() => manager.listen(conversation.id, owner, 0, () => {})).toThrow(AppError)
    await manager.close()
  })

  test('retains only safe process environment entries', () => {
    expect(providerEnvironment({
      HOME: '/home/test',
      PATH: '/usr/bin',
      LANG: 'C.UTF-8',
      MERDECK_TOKEN: 'secret',
      OPENAI_API_KEY: 'secret',
      ANTHROPIC_API_KEY: 'secret',
      HTTP_PROXY: 'http://secret@example.test',
      NODE_OPTIONS: '--require=evil',
    })).toEqual({ CI: '1', NO_COLOR: '1', TERM: 'dumb', HOME: '/home/test', PATH: '/usr/bin', LANG: 'C.UTF-8' })
  })

  test('createAgentManager registers configured agy, codex and claude adapters', async () => {
    const manager = createAgentManager({
      projectRoot: '/project',
      agents: { codex: '/bin/codex', claude: '/bin/claude', agy: '/bin/agy' },
    } as any)
    const capabilities = await manager.capabilities()
    expect(capabilities.enabled).toBe(true)
    expect(capabilities.providers.map(p => p.id)).toEqual(['codex', 'claude', 'agy'])
    expect(capabilities.providers.find(p => p.id === 'agy')?.label).toBe('Antigravity')
    await manager.close()
  })
})
