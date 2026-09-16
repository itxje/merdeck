import { describe, expect, it } from 'vitest'
import { HttpError } from '@/shared/lib/http'
import { decodeAgentCapabilities, decodeAgentConversation, decodeAgentEvent } from './api'

describe('agent response decoding', () => {
  it('accepts exact capabilities, conversations and normalized events', () => {
    const models = [{ id: 'gpt-5.6-terra', label: 'GPT-5.6-Terra', description: 'Balanced model', isDefault: true }]
    expect(decodeAgentCapabilities({ enabled: true, providers: [{ id: 'codex', label: 'Codex', models }] })).toEqual({ enabled: true, providers: [{ id: 'codex', label: 'Codex', models }] })
    expect(decodeAgentConversation({ id: 'a'.repeat(48), provider: 'claude', model: 'sonnet' })).toEqual({ id: 'a'.repeat(48), provider: 'claude', model: 'sonnet' })
    expect(decodeAgentEvent({ id: 1, type: 'assistant.delta', text: '<script>alert(1)</script>' })).toEqual({ id: 1, type: 'assistant.delta', text: '<script>alert(1)</script>' })
    expect(decodeAgentEvent({ id: 2, type: 'file.changed', path: 'docs/flow.mmd', change: 'update' })).toEqual({ id: 2, type: 'file.changed', path: 'docs/flow.mmd', change: 'update' })
    expect(decodeAgentEvent({ id: 3, type: 'approval.requested', approvalId: 'b'.repeat(48), kind: 'command', summary: 'bun test' })).toMatchObject({ type: 'approval.requested' })
  })

  it('rejects extra fields, mismatched capability flags and hostile paths', () => {
    for (const value of [
      { enabled: false, providers: [{ id: 'codex', label: 'Codex' }] },
      { enabled: true, providers: [{ id: 'shell', label: 'Shell' }] },
      { enabled: true, providers: [{ id: 'codex', label: 'Codex', models: [{ id: '--unsafe', label: 'Unsafe', description: '', isDefault: true }] }] },
      { enabled: true, providers: [{ id: 'codex', label: 'Codex', models: [{ id: 'one', label: 'One', description: '', isDefault: true }, { id: 'two', label: 'Two', description: '', isDefault: true }] }] },
      { enabled: true, providers: [{ id: 'codex', label: 'Codex', models: [{ id: 'one', label: 'Unsafe\nlabel', description: '', isDefault: true }] }] },
      { enabled: true, providers: [], extra: true },
    ])
      expect(() => decodeAgentCapabilities(value)).toThrow(HttpError)
    for (const value of [
      { id: 1, type: 'file.changed', path: '../secret', change: 'update' },
      { id: 1, type: 'assistant.delta', text: 'safe', html: '<b>unsafe</b>' },
      { id: 0, type: 'turn.completed' },
      { id: 1, type: 'approval.requested', approvalId: 'provider-id', kind: 'file_change', summary: 'edit' },
    ])
      expect(() => decodeAgentEvent(value)).toThrow(HttpError)
  })
})
