import type { EntryOperation } from './use-workspace'
import { validPath } from './api'

export type EntryKind = 'file' | 'directory'
export type EntryAction
  = | { type: 'create', kind: EntryKind, parent: string }
    | { type: 'move', kind: EntryKind, path: string, version?: string }
    | { type: 'delete', kind: EntryKind, path: string, version?: string, unsaved?: boolean }

// Mirrors the service's excluded folder names for early feedback; the service remains the authority.
const excluded = new Set(['node_modules', 'vendor', 'dist', 'build', 'coverage', 'secrets'])

export function entryPathProblem(value: string, kind: EntryKind, from?: string): string {
  if (!validPath(value))
    return 'Enter a path inside the project without empty, "." or ".." parts, backslashes, colons or percent signs.'
  const parts = value.split('/')
  if (parts.some(part => part.startsWith('.')))
    return 'Names that start with a dot are hidden and cannot be used.'
  if (parts.some(part => excluded.has(part)))
    return 'Excluded folders such as node_modules, dist and build cannot be used.'
  if (kind === 'file' && !/\.(?:mmd|mermaid|md)$/.test(value))
    return 'Use a .mmd, .mermaid or .md file name.'
  if (from === undefined)
    return ''
  if (value === from)
    return 'Enter a different path.'
  if (kind === 'file' && from.endsWith('.md') !== value.endsWith('.md'))
    return 'A rename keeps the file type: Markdown files stay .md.'
  if (kind === 'directory' && value.startsWith(`${from}/`))
    return 'A folder cannot move into itself.'
  return ''
}

export function initialEntryPath(action: EntryAction): string {
  if (action.type !== 'create')
    return action.path
  return `${action.parent ? `${action.parent}/` : ''}${action.kind === 'file' ? 'untitled.mmd' : 'new-folder'}`
}

export function entryOperation(action: EntryAction, target: string): EntryOperation {
  if (action.type === 'create')
    return { type: 'create', request: { kind: action.kind, path: target } }
  if (action.type === 'move') {
    return { type: 'move', request: action.kind === 'file' ? { kind: 'file', from: action.path, to: target, expectedVersion: action.version ?? '' } : { kind: 'directory', from: action.path, to: target } }
  }
  return { type: 'delete', request: action.kind === 'file' ? { kind: 'file', path: action.path, expectedVersion: action.version ?? '' } : { kind: 'directory', path: action.path } }
}
