import type { DiagramDocument } from '../../../../src/shared/contracts'
import { describe, expect, it } from 'vitest'
import { HttpError } from '@/shared/lib/http'
import { decodeEntry, entryErrorMessage } from './api'
import { draftsReducer } from './drafts'
import { entryOperation, entryPathProblem, initialEntryPath } from './entries'

function document(path: string, source = 'flowchart TD\nA-->B'): DiagramDocument {
  return { path, kind: 'mermaid', version: 'a'.repeat(64), blocks: [{ selector: { kind: 'standalone' }, label: 'Diagram', source, lineStart: 1, lineEnd: 2 }] }
}

describe('explorer entry actions', () => {
  it('moves drafts with files and folders without replacing other drafts', () => {
    let state = draftsReducer({}, { type: 'load', document: document('docs/a.mmd') })
    state = draftsReducer(state, { type: 'load', document: document('docs/sub/b.mmd') })
    state = draftsReducer(state, { type: 'load', document: document('other.mmd') })
    state = draftsReducer(state, { type: 'edit', path: 'docs/a.mmd', block: 0, source: 'draft' })
    state = draftsReducer(state, { type: 'revision', revision: { path: 'docs/a.mmd', state: 'deleted' } })
    expect(state['docs/a.mmd']?.warning).toEqual({ kind: 'deleted' })
    const moved = draftsReducer(state, { type: 'move', kind: 'directory', from: 'docs', to: 'guides' })
    expect(Object.keys(moved).sort()).toEqual(['guides/a.mmd', 'guides/sub/b.mmd', 'other.mmd'])
    expect(moved['guides/a.mmd']).toMatchObject({ sources: ['draft'], warning: null, baseline: { path: 'guides/a.mmd' } })
    expect(draftsReducer(moved, { type: 'move', kind: 'file', from: 'missing.mmd', to: 'x.mmd' })).toBe(moved)
    const blocked = draftsReducer(moved, { type: 'move', kind: 'file', from: 'guides/a.mmd', to: 'other.mmd' })
    expect(blocked['guides/a.mmd']?.sources).toEqual(['draft'])
    expect(blocked['other.mmd']?.baseline.path).toBe('other.mmd')
    const removed = draftsReducer(moved, { type: 'remove', path: 'guides/a.mmd' })
    expect(Object.keys(removed).sort()).toEqual(['guides/sub/b.mmd', 'other.mmd'])
    expect(draftsReducer(removed, { type: 'remove', path: 'guides/a.mmd' })).toBe(removed)
  })

  it('validates paths before requests and builds requests from actions', () => {
    expect(entryPathProblem('docs/new.mmd', 'file')).toBe('')
    expect(entryPathProblem('docs/new.html', 'file')).toBe('')
    expect(entryPathProblem('docs/new.htm', 'file')).toBe('')
    expect(entryPathProblem('docs/new.txt', 'file')).toBe('Use a .mmd, .mermaid, .md, .html or .htm file name.')
    expect(entryPathProblem('docs/.hidden.md', 'file')).toBe('Names that start with a dot are hidden and cannot be used.')
    expect(entryPathProblem('node_modules/a', 'directory')).toBe('Excluded folders such as node_modules, dist and build cannot be used.')
    expect(entryPathProblem('../a.mmd', 'file')).toContain('without empty')
    expect(entryPathProblem('docs/a.mmd', 'file', 'docs/a.mmd')).toBe('Enter a different path.')
    expect(entryPathProblem('docs/a.md', 'file', 'docs/a.mmd')).toBe('A rename keeps the file type: Mermaid, Markdown and HTML files cannot be mixed.')
    expect(entryPathProblem('docs/a.mermaid', 'file', 'docs/a.mmd')).toBe('')
    expect(entryPathProblem('docs/a.htm', 'file', 'docs/a.html')).toBe('')
    expect(entryPathProblem('docs/a.md', 'file', 'docs/a.html')).toContain('cannot be mixed')
    expect(entryPathProblem('docs/inner', 'directory', 'docs')).toBe('A folder cannot move into itself.')
    expect(initialEntryPath({ type: 'create', kind: 'file', parent: 'docs' })).toBe('docs/untitled.mmd')
    expect(initialEntryPath({ type: 'create', kind: 'directory', parent: '' })).toBe('new-folder')
    expect(initialEntryPath({ type: 'move', kind: 'file', path: 'a.mmd' })).toBe('a.mmd')
    const version = 'b'.repeat(64)
    expect(entryOperation({ type: 'move', kind: 'file', path: 'a.mmd', version }, 'b.mmd')).toEqual({ type: 'move', request: { kind: 'file', from: 'a.mmd', to: 'b.mmd', expectedVersion: version } })
    expect(entryOperation({ type: 'move', kind: 'directory', path: 'a' }, 'b')).toEqual({ type: 'move', request: { kind: 'directory', from: 'a', to: 'b' } })
    expect(entryOperation({ type: 'delete', kind: 'file', path: 'a.mmd', version }, '')).toEqual({ type: 'delete', request: { kind: 'file', path: 'a.mmd', expectedVersion: version } })
    expect(entryOperation({ type: 'delete', kind: 'directory', path: 'a' }, '')).toEqual({ type: 'delete', request: { kind: 'directory', path: 'a' } })
    expect(entryOperation({ type: 'create', kind: 'directory', parent: '' }, 'x')).toEqual({ type: 'create', request: { kind: 'directory', path: 'x' } })
  })

  it('decodes entry results and explains refusals', () => {
    expect(decodeEntry({ kind: 'file', path: 'docs/a.mmd' })).toEqual({ kind: 'file', path: 'docs/a.mmd' })
    expect(() => decodeEntry({ kind: 'link', path: 'a' })).toThrow()
    expect(() => decodeEntry({ kind: 'file', path: '../a' })).toThrow()
    expect(entryErrorMessage(new HttpError(409, 'exists', 'x'))).toContain('already exists')
    expect(entryErrorMessage(new HttpError(409, 'not_empty', 'x'))).toContain('still contains files')
    expect(entryErrorMessage(new HttpError(503, 'filesystem_unsupported', 'x'))).toContain('unavailable on this storage')
    expect(entryErrorMessage(new HttpError(418, 'teapot', 'Short and stout'))).toBe('Short and stout')
    expect(entryErrorMessage(new TypeError('offline'))).toContain('Cannot reach the service')
  })
})

it('invalidates only directory scopes affected by an entry operation', async () => {
  const { affectsDirectory } = await import('./entries')
  const move = { type: 'move' as const, request: { kind: 'directory' as const, from: 'docs', to: 'guides' } }
  for (const directory of ['', 'docs', 'docs/deep', 'guides/deep'])
    expect(affectsDirectory(move, directory)).toBe(true)
  expect(affectsDirectory(move, 'other')).toBe(false)
  expect(affectsDirectory({ type: 'create', request: { kind: 'file', path: 'docs/a.mmd' } }, 'docs')).toBe(true)
  expect(affectsDirectory({ type: 'delete', request: { kind: 'file', path: 'docs/a.mmd', expectedVersion: 'a'.repeat(64) } }, '')).toBe(false)
})
