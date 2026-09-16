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
  readonly withCredentials = true
  constructor(readonly url: string) {
    super()
    FakeEventSource.instances.push(this)
  }

  close() {}

  emit(event: AgentEvent) {
    this.dispatchEvent(new MessageEvent(event.type, { data: JSON.stringify(event) }))
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
})

it('defers provider discovery until the editor is opened', async () => {
  const capabilities = vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  const client = createQueryClient()
  const props = { session, blockedReason: undefined, onClose: vi.fn(), onActiveChange: vi.fn(), onFileChanged: vi.fn(), onSettled: vi.fn() }
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

it('sends a turn, renders hostile provider text inertly, routes approval and reports file refresh', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider] })
  vi.spyOn(agentApi, 'create').mockResolvedValue({ id: 'a'.repeat(48), provider: 'codex', model: 'gpt-fast' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  vi.spyOn(agentApi, 'approve').mockResolvedValue({ accepted: true })
  const active = vi.fn()
  const changed = vi.fn()
  const settled = vi.fn()
  const client = createQueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} onClose={vi.fn()} onActiveChange={active} onFileChanged={changed} onSettled={settled} />
    </QueryClientProvider>,
  )
  const prompt = await screen.findByLabelText('Agent instruction')
  await screen.findByRole('option', { name: 'GPT Fast' })
  await userEvent.setup().selectOptions(screen.getByLabelText('Engine'), 'codex')
  await userEvent.setup().selectOptions(screen.getByLabelText('Model'), 'gpt-fast')
  await userEvent.setup().type(prompt, 'Update flow.mmd')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(agentApi.create).toHaveBeenCalledWith('codex', 'gpt-fast', 'csrf'))
  await waitFor(() => expect(agentApi.turn).toHaveBeenCalledWith('a'.repeat(48), 'Update flow.mmd', 'csrf'))
  await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1))
  const source = FakeEventSource.instances[0]!
  source.emit({ id: 1, type: 'turn.started', turnId: 'b'.repeat(48) })
  source.emit({ id: 2, type: 'assistant.delta', text: '<img src=x onerror=alert(1)>' })
  source.emit({ id: 3, type: 'approval.requested', approvalId: 'c'.repeat(48), kind: 'file_change', summary: 'Edit flow.mmd?' })
  source.emit({ id: 4, type: 'file.changed', path: 'flow.mmd', change: 'update' })
  expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeVisible()
  expect(view.container.querySelector('img')).toBeNull()
  expect(changed).toHaveBeenCalledWith('flow.mmd')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Approve' }))
  await waitFor(() => expect(agentApi.approve).toHaveBeenCalledWith('a'.repeat(48), 'c'.repeat(48), 'approve', 'csrf'))
  expect(await screen.findByText('Approved')).toBeVisible()
  source.emit({ id: 5, type: 'turn.completed' })
  await waitFor(() => expect(active).toHaveBeenLastCalledWith(false))
  expect(settled).toHaveBeenCalled()
  view.unmount()
  client.clear()
})

it('switches engine catalogues, sends the selected pair and locks it within a conversation', async () => {
  vi.spyOn(agentApi, 'capabilities').mockResolvedValue({ enabled: true, providers: [codexProvider, claudeProvider] })
  vi.spyOn(agentApi, 'create').mockResolvedValue({ id: 'd'.repeat(48), provider: 'claude', model: 'haiku' })
  vi.spyOn(agentApi, 'turn').mockResolvedValue({ accepted: true })
  const client = createQueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <AgentChat session={session} open blockedReason={undefined} onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
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
  await waitFor(() => expect(agentApi.turn).toHaveBeenCalledWith('d'.repeat(48), 'Edit with Claude', 'csrf'))
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
      <AgentChat session={session} open blockedReason="Save or discard browser drafts before starting an agent turn." onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
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
      <AgentChat session={session} open blockedReason={undefined} onClose={vi.fn()} onActiveChange={vi.fn()} onFileChanged={vi.fn()} onSettled={vi.fn()} />
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
