import type { AgentAdapterEvent } from './types'
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'
import { agyAdapter } from './agy'
import { claudeAdapter } from './claude'
import { codexAdapter } from './codex'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function executable(root: string, name: string, source: string): Promise<string> {
  const path = `${root}/${name}`
  await writeFile(path, `#!${process.execPath}\n${source}`)
  await chmod(path, 0o700)
  return path
}

async function fixture() {
  const root = await mkdtemp(resolve('tmp/agent-adapter-'))
  roots.push(root)
  return root
}

async function waitFor(predicate: () => boolean, timeout = 3000): Promise<void> {
  const end = Date.now() + timeout
  while (!predicate()) {
    if (Date.now() >= end)
      throw new Error('Timed out waiting for fake provider')
    await Bun.sleep(10)
  }
}

describe('provider adapters', () => {
  test('Codex uses JSONL app-server, filters paths and answers provider approvals itself', async () => {
    const root = await fixture()
    const fake = await executable(root, 'fake-codex', String.raw`
const requests = []
await Bun.write('codex-launch.json', JSON.stringify({ argv: process.argv.slice(2), env: Object.keys(process.env).sort() }))
const decoder = new TextDecoder()
let pending = ''
for await (const chunk of Bun.stdin.stream()) {
  pending += decoder.decode(chunk, { stream: true })
  let newline
  while ((newline = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, newline)
    pending = pending.slice(newline + 1)
    if (!line) continue
    const message = JSON.parse(line)
    requests.push(message)
    await Bun.write('codex-requests.json', JSON.stringify(requests))
    if (message.method === 'initialize')
      console.log(JSON.stringify({ id: message.id, result: { userAgent: 'fake' } }))
    else if (message.method === 'thread/start')
      console.log(JSON.stringify({ id: message.id, result: { thread: { id: 'thread-1' } } }))
    else if (message.method === 'model/list')
      console.log(JSON.stringify({ id: message.id, result: { account: { email: 'private@example.test' }, data: [{ model: 'gpt-test', displayName: 'GPT Test', description: 'Fixture model', hidden: false, isDefault: true }, { model: '--unsafe', displayName: 'Unsafe', hidden: false }, { model: 'hidden', displayName: 'Hidden', hidden: true }], nextCursor: null } }))
    else if (message.method === 'turn/start') {
      console.log(JSON.stringify({ id: message.id, result: { turn: { id: 'turn-1' } } }))
      console.log(JSON.stringify({ method: 'item/agentMessage/delta', params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'message-1', delta: 'Changed safely.' } }))
      console.log(JSON.stringify({ method: 'item/fileChange/patchUpdated', params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'change-1', changes: [
        { path: 'flow.mmd', kind: { type: 'update', move_path: null }, diff: 'safe' },
        { path: '/etc/passwd', kind: { type: 'update', move_path: null }, diff: 'unsafe' }
      ] } }))
      console.log(JSON.stringify({ id: 'provider-file-approval', method: 'item/fileChange/requestApproval', params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'change-1', startedAtMs: 1, reason: 'Update flow.mmd' } }))
      console.log(JSON.stringify({ id: 'provider-approval', method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'command-1', startedAtMs: 1, command: 'bun test' } }))
    }
    else if (message.id === 'provider-approval')
      console.log(JSON.stringify({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } } }))
    else if (message.method === 'turn/interrupt')
      console.log(JSON.stringify({ id: message.id, result: {} }))
  }
}
`)
    expect(await codexAdapter.models?.({ executable: fake, projectRoot: root })).toEqual([
      { id: 'gpt-test', label: 'GPT Test', description: 'Fixture model', isDefault: true },
    ])
    const events: AgentAdapterEvent[] = []
    const session = await codexAdapter.open({ executable: fake, projectRoot: root, model: 'gpt-test', emit: event => events.push(event) })
    await session.startTurn('Update flow.mmd')
    await waitFor(() => events.some(event => event.type === 'turn.completed'))
    expect(events).toContainEqual({ type: 'assistant.delta', text: 'Changed safely.' })
    expect(events).toContainEqual({ type: 'file.changed', path: 'flow.mmd', change: 'update' })
    expect(events.some(event => event.type === 'file.changed' && event.path.includes('passwd'))).toBe(false)
    const requests = JSON.parse(await readFile(`${root}/codex-requests.json`, 'utf8')) as Array<Record<string, unknown>>
    // Nothing waits for a person: the in-project file change proceeds, the command's request to step
    // outside the turn's sandbox is refused, and neither reaches the browser.
    expect(requests).toContainEqual({ id: 'provider-file-approval', result: { decision: 'accept' } })
    expect(requests).toContainEqual({ id: 'provider-approval', result: { decision: 'decline' } })
    expect(events.some(event => (event as { type: string }).type === 'approval.requested')).toBe(false)
    expect(requests.find(request => request.method === 'thread/start')).toMatchObject({ params: { model: 'gpt-test', approvalPolicy: 'never' } })
    expect(requests.find(request => request.method === 'turn/start')).toMatchObject({ params: { model: 'gpt-test', approvalPolicy: 'never', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [root], networkAccess: false } } })
    expect(JSON.parse(await readFile(`${root}/codex-launch.json`, 'utf8'))).toMatchObject({ argv: ['app-server', '--listen', 'stdio://'] })
    await session.startTurn('Run a second turn after the first completed quickly')
    await session.cancel()
    await session.close()
  })

  test('Codex ignores late events from a cancelled turn after the next turn starts', async () => {
    const root = await fixture()
    const fake = await executable(root, 'fake-codex-stale', String.raw`
let pending = ''
let turn = 0
const decoder = new TextDecoder()
for await (const chunk of Bun.stdin.stream()) {
  pending += decoder.decode(chunk, { stream: true })
  let newline
  while ((newline = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, newline)
    pending = pending.slice(newline + 1)
    if (!line) continue
    const message = JSON.parse(line)
    if (message.method === 'initialize')
      console.log(JSON.stringify({ id: message.id, result: { userAgent: 'fake' } }))
    else if (message.method === 'thread/start')
      console.log(JSON.stringify({ id: message.id, result: { thread: { id: 'thread-1' } } }))
    else if (message.method === 'turn/start') {
      turn++
      const turnId = 'turn-' + turn
      console.log(JSON.stringify({ id: message.id, result: { turn: { id: turnId } } }))
      if (turn === 2) {
        console.log(JSON.stringify({ method: 'item/agentMessage/delta', params: { threadId: 'thread-1', turnId: 'turn-1', delta: 'stale' } }))
        console.log(JSON.stringify({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'interrupted' } } }))
        console.log(JSON.stringify({ method: 'item/agentMessage/delta', params: { threadId: 'thread-1', turnId: 'turn-1', delta: 'still stale' } }))
        console.log(JSON.stringify({ method: 'item/agentMessage/delta', params: { threadId: 'thread-1', turnId, delta: 'current' } }))
        console.log(JSON.stringify({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: turnId, status: 'completed' } } }))
      }
    }
    else if (message.method === 'turn/interrupt')
      console.log(JSON.stringify({ id: message.id, result: {} }))
  }
}
`)
    const events: AgentAdapterEvent[] = []
    const session = await codexAdapter.open({ executable: fake, projectRoot: root, model: undefined, emit: event => events.push(event) })
    await session.startTurn('First')
    await session.cancel()
    await session.startTurn('Second')
    await waitFor(() => events.some(event => event.type === 'turn.completed'))
    expect(events).toEqual([
      { type: 'assistant.delta', text: 'current' },
      { type: 'turn.completed' },
    ])
    await session.close()
  })

  test('Codex ignores late events from a completed turn while the next turn starts', async () => {
    const root = await fixture()
    const fake = await executable(root, 'fake-codex-completed-stale', String.raw`
let pending = ''
let turn = 0
const decoder = new TextDecoder()
for await (const chunk of Bun.stdin.stream()) {
  pending += decoder.decode(chunk, { stream: true })
  let newline
  while ((newline = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, newline)
    pending = pending.slice(newline + 1)
    if (!line) continue
    const message = JSON.parse(line)
    if (message.method === 'initialize')
      console.log(JSON.stringify({ id: message.id, result: { userAgent: 'fake' } }))
    else if (message.method === 'thread/start')
      console.log(JSON.stringify({ id: message.id, result: { thread: { id: 'thread-1' } } }))
    else if (message.method === 'turn/start') {
      turn++
      const turnId = 'turn-' + turn
      console.log(JSON.stringify({ id: message.id, result: { turn: { id: turnId } } }))
      if (turn === 1) {
        console.log(JSON.stringify({ method: 'item/agentMessage/delta', params: { threadId: 'thread-1', turnId, delta: 'first' } }))
        console.log(JSON.stringify({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: turnId, status: 'completed' } } }))
      }
      else {
        console.log(JSON.stringify({ method: 'item/agentMessage/delta', params: { threadId: 'thread-1', turnId: 'turn-1', delta: 'late first' } }))
        console.log(JSON.stringify({ method: 'item/agentMessage/delta', params: { threadId: 'thread-1', turnId, delta: 'second' } }))
        console.log(JSON.stringify({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: turnId, status: 'completed' } } }))
      }
    }
  }
}
`)
    const events: AgentAdapterEvent[] = []
    const session = await codexAdapter.open({ executable: fake, projectRoot: root, model: undefined, emit: event => events.push(event) })
    await session.startTurn('First')
    await waitFor(() => events.some(event => event.type === 'turn.completed'))
    events.length = 0
    await session.startTurn('Second')
    await waitFor(() => events.some(event => event.type === 'turn.completed'))
    expect(events).toEqual([
      { type: 'assistant.delta', text: 'second' },
      { type: 'turn.completed' },
    ])
    await session.close()
  })

  test('Claude uses restricted file tools and allows in-project work without approvals', async () => {
    const root = await fixture()
    const fake = await executable(root, 'fake-claude', String.raw`
const inputs = []
await Bun.write('claude-launch.json', JSON.stringify({ argv: process.argv.slice(2), env: Object.keys(process.env).sort() }))
const decoder = new TextDecoder()
let pending = ''
let inside = false
let outside = false
let missing = false
let finished = false
async function finish() {
  if (!inside || !outside || !missing || finished) return
  finished = true
  console.log(JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'ok', is_error: false }] } }))
  console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false }))
}
for await (const chunk of Bun.stdin.stream()) {
  pending += decoder.decode(chunk, { stream: true })
  let newline
  while ((newline = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, newline)
    pending = pending.slice(newline + 1)
    if (!line) continue
    const message = JSON.parse(line)
    inputs.push(message)
    await Bun.write('claude-inputs.json', JSON.stringify(inputs))
    if (message.type === 'control_request' && message.request?.subtype === 'initialize') {
      console.log(JSON.stringify({ type: 'control_response', response: { subtype: 'success', request_id: message.request_id, response: { session_state: 'idle', account: { email: 'private@example.test' }, models: [{ value: 'default', displayName: 'Default', description: 'Provider default' }, { value: 'sonnet', displayName: 'Sonnet', description: 'Fixture model' }, { value: '--unsafe', displayName: 'Unsafe' }] } } }))
      console.log(JSON.stringify({ type: 'control_request', request_id: 'idle', request: { subtype: 'can_use_tool', tool_name: 'Write', input: { file_path: 'idle.mmd', content: 'unsafe' } } }))
    }
    else if (message.type === 'control_request' && message.request?.subtype === 'interrupt')
      console.log(JSON.stringify({ type: 'control_response', response: { subtype: 'success', request_id: message.request_id, response: {} } }))
    else if (message.type === 'user') {
      console.log(JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: '<img src=x onerror=alert(1)>' } } }))
      console.log(JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: 'tool-1', name: 'Edit', input: { file_path: 'flow.mmd', old_string: 'A', new_string: 'B' } }] } }))
      console.log(JSON.stringify({ type: 'control_request', request_id: 'inside', request: { subtype: 'can_use_tool', tool_name: 'Edit', input: { file_path: 'flow.mmd', old_string: 'A', new_string: 'B' } } }))
      console.log(JSON.stringify({ type: 'control_request', request_id: 'outside', request: { subtype: 'can_use_tool', tool_name: 'Read', input: { file_path: '/etc/passwd' } } }))
      console.log(JSON.stringify({ type: 'control_request', request_id: 'missing', request: { subtype: 'can_use_tool', tool_name: 'Write', input: { content: 'unsafe' } } }))
    }
    else if (message.type === 'control_response' && message.response?.request_id === 'inside') {
      inside = message.response.response?.behavior === 'allow'
      await finish()
    }
    else if (message.type === 'control_response' && message.response?.request_id === 'outside') {
      outside = message.response.response?.behavior === 'deny'
      await finish()
    }
    else if (message.type === 'control_response' && message.response?.request_id === 'missing') {
      missing = message.response.response?.behavior === 'deny'
      await finish()
    }
  }
}
`)
    expect(await claudeAdapter.models?.({ executable: fake, projectRoot: root })).toEqual([
      { id: 'default', label: 'Default', description: 'Provider default', isDefault: true },
      { id: 'sonnet', label: 'Sonnet', description: 'Fixture model', isDefault: false },
    ])
    const events: AgentAdapterEvent[] = []
    const session = await claudeAdapter.open({ executable: fake, projectRoot: root, model: 'sonnet', emit: event => events.push(event) })
    await session.startTurn('Edit the file')
    await waitFor(() => events.some(event => event.type === 'turn.completed'))
    expect(events.some(event => (event as { type: string }).type === 'approval.requested')).toBe(false)
    expect(events).toContainEqual({ type: 'assistant.delta', text: '<img src=x onerror=alert(1)>' })
    expect(events).toContainEqual({ type: 'tool.started', label: 'Edit flow.mmd' })
    expect(events).toContainEqual({ type: 'file.changed', path: 'flow.mmd', change: 'update' })
    const launch = JSON.parse(await readFile(`${root}/claude-launch.json`, 'utf8')) as { argv: string[] }
    expect(launch.argv).toContain('--restricted')
    expect(launch.argv).toContain('--safe-mode')
    expect(launch.argv).toContain('--model=sonnet')
    expect(launch.argv).not.toContain('Bash')
    // The panel exists to change files, so the file tools are named as available and as pre-approved; a
    // provider that renames either argument fails here rather than leaving the panel unable to write.
    expect(launch.argv.slice(launch.argv.indexOf('--tools'), launch.argv.indexOf('--tools') + 2)).toEqual(['--tools', 'Read,Edit,Write,Glob,Grep'])
    expect(launch.argv.slice(launch.argv.indexOf('--allowedTools'), launch.argv.indexOf('--allowedTools') + 2)).toEqual(['--allowedTools', 'Read,Edit,Write,Glob,Grep'])
    const inputs = JSON.parse(await readFile(`${root}/claude-inputs.json`, 'utf8')) as Array<Record<string, any>>
    expect(inputs.find(input => input.response?.request_id === 'outside')?.response.response).toMatchObject({ behavior: 'deny' })
    expect(inputs.find(input => input.response?.request_id === 'missing')?.response.response).toMatchObject({ behavior: 'deny' })
    expect(inputs.find(input => input.response?.request_id === 'idle')?.response.response).toMatchObject({ behavior: 'deny' })
    expect(inputs.find(input => input.response?.request_id === 'inside')?.response.response).toMatchObject({ behavior: 'allow', updatedInput: { file_path: 'flow.mmd' } })
    await session.close()
  })

  test('Antigravity (agy) uses stream-json, emits deltas and tracks tool file mutations', async () => {
    const root = await fixture()
    const fake = await executable(root, 'fake-agy', String.raw`
if (process.argv[2] === 'models') {
  console.log('gemini-flash\tGemini Flash\ngpt-model\tGPT Model\n--unsafe\tUnsafe\n')
  process.exit(0)
}
await Bun.write('agy-launch.json', JSON.stringify({ argv: process.argv.slice(2), env: Object.keys(process.env).sort() }))
const inputs = []
const decoder = new TextDecoder()
let pending = ''
for await (const chunk of Bun.stdin.stream()) {
  pending += decoder.decode(chunk, { stream: true })
  let newline
  while ((newline = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, newline)
    pending = pending.slice(newline + 1)
    if (!line) continue
    const message = JSON.parse(line)
    inputs.push(message)
    await Bun.write('agy-inputs.json', JSON.stringify(inputs))
    if (message.event === 'user') {
      console.log(JSON.stringify({ event: 'step_update', step_update: { step_type: 'agent_response', text_delta: 'Hello from agy' } }))
      console.log(JSON.stringify({ event: 'step_update', step_update: { step_type: 'tool', state: 'ACTIVE', tool_name: 'write_to_file' } }))
      console.log(JSON.stringify({ event: 'step_update', step_update: { step_type: 'tool', state: 'DONE', tool_name: 'write_to_file', tool_info: { parameters: { TargetFile: 'diagram.mmd' } } } }))
      console.log(JSON.stringify({ event: 'result', result: { status: 'SUCCESS' } }))
    }
  }
}
`)
    expect(await agyAdapter.models?.({ executable: fake, projectRoot: root })).toEqual([
      { id: 'gemini-flash', label: 'Gemini Flash', description: '', isDefault: true },
      { id: 'gpt-model', label: 'GPT Model', description: '', isDefault: false },
    ])
    const events: AgentAdapterEvent[] = []
    const session = await agyAdapter.open({ executable: fake, projectRoot: root, model: 'gemini-flash', emit: event => events.push(event) })
    await session.startTurn('Update diagram')
    await waitFor(() => events.some(event => event.type === 'turn.completed'))
    expect(events).toContainEqual({ type: 'assistant.delta', text: 'Hello from agy' })
    expect(events).toContainEqual({ type: 'tool.started', label: 'write_to_file' })
    expect(events).toContainEqual({ type: 'file.changed', path: 'diagram.mmd', change: 'update' })
    expect(events).toContainEqual({ type: 'turn.completed' })
    const launch = JSON.parse(await readFile(`${root}/agy-launch.json`, 'utf8')) as { argv: string[] }
    expect(launch.argv).toContain('--input-format')
    expect(launch.argv).toContain('stream-json')
    expect(launch.argv).toContain('--dangerously-skip-permissions')
    expect(launch.argv).toContain('--model=gemini-flash')
    await session.close()
  })
})
