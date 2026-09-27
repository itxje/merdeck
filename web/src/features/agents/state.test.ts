import { describe, expect, it } from 'vitest'
import { agentChatReducer, initialAgentChatState } from './state'

describe('agent chat state', () => {
  it('coalesces assistant deltas, records file changes and ignores replayed events', () => {
    let state = agentChatReducer(initialAgentChatState, { type: 'starting', prompt: 'Edit it' })
    state = agentChatReducer(state, { type: 'event', event: { id: 1, type: 'assistant.delta', text: '<img src=x>' } })
    state = agentChatReducer(state, { type: 'event', event: { id: 2, type: 'assistant.delta', text: ' done' } })
    state = agentChatReducer(state, { type: 'event', event: { id: 3, type: 'file.changed', path: 'docs/flow.mmd', change: 'update' } })
    const replayed = agentChatReducer(state, { type: 'event', event: { id: 2, type: 'assistant.delta', text: ' duplicate' } })
    expect(replayed).toBe(state)
    expect(state.items).toMatchObject([
      { kind: 'user', text: 'Edit it' },
      { kind: 'assistant', text: '<img src=x> done' },
      { kind: 'file', path: 'docs/flow.mmd', change: 'update' },
    ])
    state = agentChatReducer(state, { type: 'event', event: { id: 4, type: 'turn.completed' } })
    expect(state.active).toBe(false)
    state = agentChatReducer(state, { type: 'conversation.reset' })
    expect(state.lastEventId).toBe(0)
    state = agentChatReducer(state, { type: 'event', event: { id: 1, type: 'assistant.delta', text: 'new session' } })
    expect(state.items.at(-1)).toMatchObject({ kind: 'assistant', text: 'new session' })
    expect(agentChatReducer(state, { type: 'conversation.cleared' })).toEqual(initialAgentChatState)
  })
})
