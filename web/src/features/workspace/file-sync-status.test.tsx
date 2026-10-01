import type { DiagramDocument } from '../../../../src/shared/contracts'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { draftsReducer } from './drafts'
import { FileSyncStatus } from './file-sync-status'

const path = 'example.md'
function document(first = 'A', version = 'a'): DiagramDocument {
  return {
    path,
    kind: 'markdown',
    text: first,
    version: version.repeat(64),
    blocks: [first, 'B'].map((source, index) => ({ source, label: `Diagram ${index + 1}`, selector: { kind: 'markdown', id: `md:${index}:0:1` }, lineStart: 1, lineEnd: 1 })),
  }
}
const load = () => draftsReducer({}, { type: 'load', document: document() })

describe('file synchronization status', () => {
  it('reports pending sibling edits even after another block saves successfully', () => {
    let state = load()
    const view = render(<FileSyncStatus file={state[path]!} />)
    expect(screen.getByRole('status')).toHaveTextContent('Synced')
    state = draftsReducer(state, { type: 'edit', path, block: 1, source: 'Sibling draft' })
    state = draftsReducer(state, { type: 'edit', path, block: 0, source: 'Submitted' })
    state = draftsReducer(state, { type: 'saving', path, id: 1, block: 0 })
    view.rerender(<FileSyncStatus file={state[path]!} />)
    expect(screen.getByRole('status')).toHaveTextContent('Syncing')
    state = draftsReducer(state, { type: 'saved', path, id: 1, document: document('Submitted', 'b') })
    expect(state[path]!.saved).toBe(true)
    view.rerender(<FileSyncStatus file={state[path]!} />)
    expect(screen.getByRole('status')).toHaveTextContent('Not synced')
    expect(screen.getByRole('status')).toHaveAttribute('data-sync-state', 'pending')
  })

  it('keeps newer typing pending after the submitted version is acknowledged', () => {
    let state = load()
    state = draftsReducer(state, { type: 'edit', path, block: 0, source: 'Submitted' })
    state = draftsReducer(state, { type: 'saving', path, id: 1, block: 0 })
    state = draftsReducer(state, { type: 'edit', path, block: 0, source: 'Newer typing' })
    state = draftsReducer(state, { type: 'saved', path, id: 1, document: document('Submitted', 'b') })
    render(<FileSyncStatus file={state[path]!} />)
    expect(screen.getByRole('status')).toHaveTextContent('Not synced')
  })

  it('announces actual save refusal without exposing a tooltip or click control', () => {
    const state = draftsReducer(load(), { type: 'error', path, message: 'Save refused' })
    render(<FileSyncStatus file={state[path]!} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Sync failed')
    expect(status).toHaveAttribute('data-sync-state', 'failed')
    expect(status).not.toHaveAttribute('title')
    expect(status.querySelector('.sr-only')).toHaveTextContent('Sync failed')
    expect(status.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it.each(['revision', 'deleted', 'session', 'layout'] as const)('never reports synchronized content with an unresolved %s warning', (kind) => {
    const file = load()[path]!
    const warning = kind === 'revision' ? { kind, version: 'b'.repeat(64), divergent: false } : { kind }
    render(<FileSyncStatus file={{ ...file, warning }} />)
    expect(screen.getByRole('status')).toHaveAttribute('data-sync-state', 'failed')
    expect(screen.getByRole('status')).toHaveTextContent(kind === 'layout' ? 'Sync failed' : 'Sync needs attention')
  })

  it('keeps locked drafts in the attention state even without a warning', () => {
    render(<FileSyncStatus file={{ ...load()[path]!, locked: true }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Sync needs attention')
  })
})
