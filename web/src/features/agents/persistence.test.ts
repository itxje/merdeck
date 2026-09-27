import { expect, it } from 'vitest'
import { emptyAgentSession, readAgentSession, writeAgentSession } from './persistence'

const conversation = { id: 'a'.repeat(48), provider: 'claude' as const, model: 'sonnet' }
const selection = { provider: 'claude' as const, model: 'sonnet' }
const items = [
  { key: 'user:1', kind: 'user' as const, text: 'Rename the node' },
  { key: 'event:2', kind: 'tool' as const, label: 'Edit docs/flow.md' },
  { key: 'event:3', kind: 'file' as const, path: 'docs/flow.md', change: 'update' as const },
]

it('restores one tab transcript, conversation and engine/model selection, always idle', () => {
  writeAgentSession({ conversation, selection, state: { active: true, lastEventId: 3, items } })
  expect(readAgentSession()).toEqual({ conversation, selection, state: { active: false, lastEventId: 3, items } })
})

it('keeps the last selected engine and model even without a started conversation', () => {
  writeAgentSession({ conversation: null, selection: { provider: 'codex', model: 'gpt-fast' }, state: { active: false, lastEventId: 0, items: [] } })
  expect(readAgentSession()).toEqual({ conversation: null, selection: { provider: 'codex', model: 'gpt-fast' }, state: { active: false, lastEventId: 0, items: [] } })
})

it('keeps the transcript after the conversation is abandoned and clears an empty panel', () => {
  writeAgentSession({ conversation: null, selection: null, state: { active: false, lastEventId: 0, items: items.slice(0, 1) } })
  expect(readAgentSession().conversation).toBeNull()
  expect(readAgentSession().state.items).toHaveLength(1)
  writeAgentSession({ conversation: null, selection: null, state: { active: false, lastEventId: 0, items: [] } })
  expect(sessionStorage.getItem('merdeck-agent-session')).toBeNull()
})

it('refuses malformed, foreign or oversized stored state instead of rendering it', () => {
  for (const raw of [
    'not json',
    JSON.stringify({ state: { active: false, lastEventId: 1, items: [{ key: 'k', kind: 'script', text: 'x' }] } }),
    JSON.stringify({ state: { active: false, lastEventId: 1, items: [{ key: 'k', kind: 'file', path: '../escape.md', change: 'update' }] } }),
    // An approval stored before approvals were removed is an unknown kind now, however well formed.
    JSON.stringify({ state: { active: false, lastEventId: 1, items: [{ key: 'k', kind: 'approval', approvalId: 'b'.repeat(48), approvalKind: 'command', summary: 'bun test', answered: 'deny' }] } }),
    JSON.stringify({ state: { active: false, lastEventId: -1, items: [] } }),
    JSON.stringify({ state: { active: false, lastEventId: 1 } }),
    JSON.stringify({ state: null }),
  ]) {
    sessionStorage.setItem('merdeck-agent-session', raw)
    expect(readAgentSession()).toEqual(emptyAgentSession)
  }
})

it('drops a conversation handle that is not an advertised engine and opaque ID', () => {
  for (const candidate of [{ id: 'short', provider: 'codex', model: 'gpt' }, { id: 'a'.repeat(48), provider: 'other', model: 'gpt' }, { id: 'a'.repeat(48), provider: 'codex' }]) {
    sessionStorage.setItem('merdeck-agent-session', JSON.stringify({ conversation: candidate, state: { active: false, lastEventId: 2, items: [] } }))
    const restored = readAgentSession()
    expect(restored.conversation).toBeNull()
    expect(restored.state.lastEventId).toBe(2)
  }
})

it('drops a selection that is not an advertised engine', () => {
  sessionStorage.setItem('merdeck-agent-session', JSON.stringify({ selection: { provider: 'other', model: 'gpt' }, state: { active: false, lastEventId: 2, items: [] } }))
  expect(readAgentSession().selection).toBeNull()
})
