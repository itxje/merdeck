import type { AgentEvent } from '../../../../src/shared/contracts'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/shared/lib/query'
import { AgentChat } from './agent-chat'
import { agentApi } from './api'

class FakeEventSource extends EventTarget {
  static instances: FakeEventSource[] = []
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  readonly withCredentials = true
  readyState = FakeEventSource.OPEN
  constructor(readonly url: string) {
    super()
    FakeEventSource.instances.push(this)
  }

  close() {
    this.readyState = FakeEventSource.CLOSED
  }

  emit(event: AgentEvent) {
    this.dispatchEvent(new MessageEvent(event.type, { data: JSON.stringify(event) }))
  }

  // The browser retries a dropped stream on its own and only reports CLOSED once it gives up.
  fail(state: number) {
    this.readyState = state
    this.dispatchEvent(new Event('error'))
  }
}

const session = {
  authenticated: true as const,
  access: 'token' as const,
  csrfToken: 'csrf',
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  version: 'test',
  pollIntervalMs: 3000,
  maxSourceBytes: 1048576,
  storage: { writable: true, identity: 'stable' as const, filesystemType: 'test', supportedFilesystem: 'test' },
}
const openSession = {
  authenticated: true as const,
  access: 'open' as const,
  version: 'test',
  pollIntervalMs: 3000,
  maxSourceBytes: 1048576,
  storage: { writable: true, identity: 'stable' as const, filesystemType: 'test', supportedFilesystem: 'test' },
}

const codexProvider = { id: 'codex' as const, label: 'Codex', models: [
  { id: 'gpt-safe', label: 'GPT Safe', description: 'Default model', isDefault: true },
  { id: 'gpt-fast', label: 'GPT Fast', description: 'Fast model', isDefault: false },
] }
const claudeProvider = { id: 'claude' as const, label: 'Claude Code', models: [
  { id: 'sonnet', label: 'Sonnet', description: 'Default model', isDefault: true },
  { id: 'haiku', label: 'Haiku', description: 'Fast model', isDefault: false },
] }

beforeEach(() => {
  FakeEventSource.instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  const media = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal('matchMedia', () => media)
})

it('defers provider discovery until the editor is opened', async () => {
  const capabilities = vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  const client = createQueryClient()
  const props = { session, blockedReason: undefined, activePath: undefined, onClose: vi.fn(), onActiveChange: vi.fn(), onFileChanged: vi.fn(), onSettled: vi.fn() }
  const view = render(
    <QueryClientProvider client={client}>
      <AgentChat {...props} open={false} />
    </QueryClientProvider>,
  )
  expect(capabilities).not.toHaveBeenCalled()
  view.rerender(
    <QueryClientProvider client={client}>
      <AgentChat {...props} open />
    </QueryClientProvider>,
  )
  await waitFor(() => expect(capabilities).toHaveBeenCalledOnce())
  client.clear()
})

it('sends a turn, renders hostile provider text inertly and reports file refresh', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  vi.spyOn(agentApi, 'create').mockResolvedValue({ id: 'a'.repeat(48), provider: 'codex', model: 'gpt-fast' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const active = vi.fn()
  const changed = vi.fn()
  const settled = vi.fn()
  const client = createQueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} activePath="docs/flow.md" onClose={vi.fn()} onActiveChange={active} onFileChanged={changed} onSettled={settled} />
    </QueryClientProvider>,
  )
  const prompt = await screen.findByLabelText('Agent instruction')
  await screen.findByRole('option', { name: 'GPT Fast' })
  await userEvent.setup().selectOptions(screen.getByLabelText('Engine'), 'codex')
  await userEvent.setup().selectOptions(screen.getByLabelText('Model'), 'gpt-fast')
  await userEvent.setup().type(prompt, 'Update flow.mmd')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(agentApi.create).toHaveBeenCalledWith('codex', 'gpt-fast', 'csrf'))
  await waitFor(() => expect(agentApi.turn).toHaveBeenCalledWith('a'.repeat(48), 'Update flow.mmd', { path: 'docs/flow.md' }, 'csrf'))
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
  const source = FakeEventSource.instances[0]!
  source.emit({ id: 1, type: 'turn.started', turnId: 'b'.repeat(48) })
  source.emit({ id: 2, type: 'assistant.delta', text: '<img src=x onerror=alert(1)>' })
  source.emit({ id: 3, type: 'file.changed', path: 'flow.mmd', change: 'update' })
  expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeVisible()
  expect(view.container.querySelector('img')).toBeNull()
  expect(changed).toHaveBeenCalledWith('flow.mmd')
  // The provider edits project files without a confirmation standing between it and the write.
  expect(screen.queryByRole('region', { name: 'Agent approval request' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
  source.emit({ id: 4, type: 'turn.completed' })
  await waitFor(() => expect(active).toHaveBeenLastCalledWith(false))
  expect(settled).toHaveBeenCalled()
  view.unmount()
  client.clear()
})

it('sends open-access turns without manufacturing a CSRF token', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  vi.spyOn(agentApi, 'create').mockResolvedValue({ id: 'e'.repeat(48), provider: 'codex', model: 'gpt-safe' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const client = createQueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <AgentChat session={openSession} open blockedReason={undefined} activePath="docs/flow.md" onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Agent instruction'), 'Edit in open access')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(agentApi.create).toHaveBeenCalledWith('codex', 'gpt-safe', undefined))
  await waitFor(() => expect(agentApi.turn).toHaveBeenCalledWith('e'.repeat(48), 'Edit in open access', { path: 'docs/flow.md' }, undefined))
  view.unmount()
  client.clear()
})

it('switches engine catalogues, sends the selected pair and locks it for the running turn', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider, claudeProvider] })
  vi.spyOn(agentApi, 'create').mockResolvedValue({ id: 'd'.repeat(48), provider: 'claude', model: 'haiku' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const client = createQueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} activePath="docs/flow.md" onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  const engine = await screen.findByLabelText('Engine')
  const model = screen.getByLabelText('Model')
  await screen.findByRole('option', { name: 'Claude Code' })
  await user.selectOptions(engine, 'claude')
  expect(model).toHaveValue('sonnet')
  expect(screen.queryByRole('option', { name: 'GPT Fast' })).toBeNull()
  await user.selectOptions(model, 'haiku')
  await user.type(screen.getByLabelText('Agent instruction'), 'Edit with Claude')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(agentApi.create).toHaveBeenCalledWith('claude', 'haiku', 'csrf'))
  await waitFor(() => expect(agentApi.turn).toHaveBeenCalledWith('d'.repeat(48), 'Edit with Claude', { path: 'docs/flow.md' }, 'csrf'))
  expect(engine).toBeDisabled()
  expect(model).toBeDisabled()
  view.unmount()
  client.clear()
})

it('blocks a new turn while browser drafts exist', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason="Save or discard browser drafts before starting an agent turn." activePath="docs/flow.md" onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
    </QueryClientProvider>,
  )
  const prompt = await screen.findByLabelText('Agent instruction')
  fireEvent.change(prompt, { target: { value: 'Edit it' } })
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  expect(screen.getByText('Save or discard browser drafts before starting an agent turn.')).toBeVisible()
  client.clear()
})

it('abandons a failed provider session and accepts events from a replacement conversation', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  vi.spyOn(agentApi, 'create')
    .mockResolvedValueOnce({ id: 'a'.repeat(48), provider: 'codex', model: 'gpt-safe' })
    .mockResolvedValueOnce({ id: 'b'.repeat(48), provider: 'codex', model: 'gpt-safe' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} activePath="docs/flow.md" onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
    </QueryClientProvider>,
  )
  const prompt = await screen.findByLabelText('Agent instruction')
  const user = userEvent.setup()
  await user.type(prompt, 'First turn')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
  FakeEventSource.instances[0]!.emit({ id: 1, type: 'turn.started', turnId: 'c'.repeat(48) })
  FakeEventSource.instances[0]!.emit({ id: 2, type: 'provider.unavailable', message: 'The provider is unavailable.' })
  expect(await screen.findByText('The provider is unavailable.')).toBeVisible()

  await user.type(prompt, 'Retry turn')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(2))
  FakeEventSource.instances[1]!.emit({ id: 1, type: 'turn.started', turnId: 'd'.repeat(48) })
  FakeEventSource.instances[1]!.emit({ id: 2, type: 'assistant.delta', text: 'Recovered' })
  expect(await screen.findByText('Recovered')).toBeVisible()
  expect(agentApi.create).toHaveBeenCalledTimes(2)
  client.clear()
})

it('continues the same conversation after a failed turn', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  const create = vi.spyOn(agentApi, 'create').mockResolvedValue({ id: 'a'.repeat(48), provider: 'codex', model: 'gpt-safe' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} activePath={undefined} onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
    </QueryClientProvider>,
  )
  const prompt = await screen.findByLabelText('Agent instruction')
  const user = userEvent.setup()
  await user.type(prompt, 'First turn')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
  FakeEventSource.instances[0]!.emit({ id: 2, type: 'turn.started', turnId: 'c'.repeat(48) })
  FakeEventSource.instances[0]!.emit({ id: 3, type: 'turn.failed', message: 'The provider could not complete the turn.' })
  expect(await screen.findByText('The provider could not complete the turn.')).toBeVisible()

  await user.type(prompt, 'Second turn')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(agentApi.turn).toHaveBeenLastCalledWith('a'.repeat(48), 'Second turn', undefined, 'csrf'))
  expect(create).toHaveBeenCalledTimes(1)
  expect(FakeEventSource.instances).toHaveLength(1)
  client.clear()
})

it('ends the conversation and clears the transcript from the New control', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  const create = vi.spyOn(agentApi, 'create')
    .mockResolvedValueOnce({ id: 'a'.repeat(48), provider: 'codex', model: 'gpt-safe' })
    .mockResolvedValueOnce({ id: 'b'.repeat(48), provider: 'codex', model: 'gpt-safe' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const close = vi.spyOn(agentApi, 'close').mockResolvedValue({ closed: true })
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} activePath={undefined} onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
    </QueryClientProvider>,
  )
  const prompt = await screen.findByLabelText('Agent instruction')
  const fresh = screen.getByRole('button', { name: 'New conversation' })
  expect(fresh).toBeDisabled()
  const user = userEvent.setup()
  await user.type(prompt, 'First turn')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
  FakeEventSource.instances[0]!.emit({ id: 2, type: 'turn.started', turnId: 'c'.repeat(48) })
  await waitFor(() => expect(fresh).toBeDisabled())
  FakeEventSource.instances[0]!.emit({ id: 3, type: 'assistant.delta', text: 'Done' })
  FakeEventSource.instances[0]!.emit({ id: 4, type: 'turn.completed' })
  await waitFor(() => expect(fresh).toBeEnabled())

  await user.click(fresh)
  await waitFor(() => expect(close).toHaveBeenCalledWith('a'.repeat(48), 'csrf'))
  expect(screen.queryByText('First turn')).toBeNull()
  expect(screen.queryByText('Done')).toBeNull()
  expect(FakeEventSource.instances[0]!.readyState).toBe(FakeEventSource.CLOSED)
  expect(fresh).toBeDisabled()
  expect(JSON.parse(sessionStorage.getItem('merdeck-agent-session') ?? '{}').conversation ?? null).toBeNull()

  await user.type(prompt, 'Fresh start')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(agentApi.turn).toHaveBeenLastCalledWith('b'.repeat(48), 'Fresh start', undefined, 'csrf'))
  expect(create).toHaveBeenCalledTimes(2)
  client.clear()
})

it('reopens the engine and model once a turn settles and sends the replacement pair', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  const create = vi.spyOn(agentApi, 'create')
    .mockResolvedValueOnce({ id: 'a'.repeat(48), provider: 'codex', model: 'gpt-safe' })
    .mockResolvedValueOnce({ id: 'b'.repeat(48), provider: 'codex', model: 'gpt-fast' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const close = vi.spyOn(agentApi, 'close').mockResolvedValue({ closed: true })
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} activePath="docs/flow.md" onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  const prompt = await screen.findByLabelText('Agent instruction')
  const engine = screen.getByLabelText('Engine')
  const model = screen.getByLabelText('Model')
  await screen.findByRole('option', { name: 'GPT Fast' })
  await user.type(prompt, 'First turn')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
  FakeEventSource.instances[0]!.emit({ id: 1, type: 'turn.started', turnId: 'c'.repeat(48) })
  await waitFor(() => expect(model).toBeDisabled())
  expect(engine).toBeDisabled()
  FakeEventSource.instances[0]!.emit({ id: 2, type: 'turn.completed' })
  await waitFor(() => expect(model).toBeEnabled())
  expect(engine).toBeEnabled()
  await user.selectOptions(model, 'gpt-fast')
  await user.type(prompt, 'Second turn')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(create).toHaveBeenLastCalledWith('codex', 'gpt-fast', 'csrf'))
  await waitFor(() => expect(agentApi.turn).toHaveBeenLastCalledWith('b'.repeat(48), 'Second turn', { path: 'docs/flow.md' }, 'csrf'))
  expect(close).toHaveBeenCalledWith('a'.repeat(48), 'csrf')
  client.clear()
})

it('reports a retrying stream and settles the panel when the stream is dropped for good', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  vi.spyOn(agentApi, 'create').mockResolvedValue({ id: 'a'.repeat(48), provider: 'codex', model: 'gpt-safe' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} activePath="docs/flow.md" onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Agent instruction'), 'Only turn')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
  const source = FakeEventSource.instances[0]!
  source.emit({ id: 1, type: 'turn.started', turnId: 'c'.repeat(48) })
  source.emit({ id: 2, type: 'turn.completed' })
  source.fail(FakeEventSource.CONNECTING)
  expect(await screen.findByText('Reconnecting…')).toBeVisible()
  // The service drops an expired conversation, so the retry cannot succeed and the panel must settle.
  source.fail(FakeEventSource.CLOSED)
  expect(await screen.findByText('Direct local CLI session')).toBeVisible()
  await waitFor(() => expect(screen.getByLabelText('Model')).toBeEnabled())
  client.clear()
})

it('names the previewed file above the composer and omits it while nothing is open', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  vi.spyOn(agentApi, 'create').mockResolvedValue({ id: 'f'.repeat(48), provider: 'codex', model: 'gpt-safe' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const client = createQueryClient()
  const props = { session, open: true, blockedReason: undefined, onClose: vi.fn(), onActiveChange: vi.fn(), onFileChanged: vi.fn(), onSettled: vi.fn() }
  const view = render(
    <QueryClientProvider client={client}>
      <AgentChat {...props} activePath="docs/flow.md" />
    </QueryClientProvider>,
  )
  expect(await screen.findByLabelText('Attached file')).toHaveTextContent('docs/flow.md')
  view.rerender(
    <QueryClientProvider client={client}>
      <AgentChat {...props} activePath={undefined} />
    </QueryClientProvider>,
  )
  expect(screen.queryByLabelText('Attached file')).toBeNull()
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Agent instruction'), 'Edit without an open file')
  await user.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(agentApi.turn).toHaveBeenCalledWith('f'.repeat(48), 'Edit without an open file', undefined, 'csrf'))
  view.unmount()
  client.clear()
})

it('restores the transcript and resumes the stored conversation stream after a reload', async () => {
  sessionStorage.setItem('merdeck-agent-session', JSON.stringify({
    conversation: { id: 'b'.repeat(48), provider: 'codex', model: 'gpt-fast' },
    state: { active: true, lastEventId: 7, items: [{ key: 'user:1', kind: 'user', text: 'Rename the node' }, { key: 'event:2', kind: 'tool', label: 'Edit docs/flow.md' }] },
  }))
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  const create = vi.spyOn(agentApi, 'create')
  const client = createQueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} activePath="docs/flow.md" onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Rename the node')).toBeVisible()
  expect(screen.getByText('Edit docs/flow.md')).toBeVisible()
  // The stream resumes after the last stored event instead of replaying the whole window.
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
  expect(FakeEventSource.instances[0]!.url).toContain('after=7')
  expect(create).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.getByLabelText('Model')).toHaveValue('gpt-fast'))
  // A conversation the service no longer holds is dropped, and the transcript stays readable.
  FakeEventSource.instances[0]!.fail(FakeEventSource.CLOSED)
  await waitFor(() => expect(JSON.parse(sessionStorage.getItem('merdeck-agent-session') ?? '{}').conversation).toBeNull())
  expect(screen.getByText('Rename the node')).toBeVisible()
  view.unmount()
  client.clear()
})
