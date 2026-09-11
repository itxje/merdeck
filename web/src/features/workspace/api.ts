import type { CreateEntryRequest, DeleteEntryRequest, DiagramBlock, DiagramBlockSummary, DiagramDocument, DiagramSelector, DocumentRevision, EntryChange, MoveEntryRequest, SaveDiagramRequest, SessionStatus, TreeEntry, TreeSnapshot } from '../../../../src/shared/contracts'
import { HttpError, requestApi } from '@/shared/lib/http'

export type Session = Extract<SessionStatus, { authenticated: true }>
/** The CSRF token that mutations send; open access has none. */
export const sessionCsrf = (session: Session) => session.access === 'token' ? session.csrfToken : undefined
export const absoluteSourceLimit = 8 * 1024 * 1024
function invalid(): never {
  throw new HttpError(502, 'invalid_response', 'The service returned an invalid response.')
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return invalid()
  return value as Record<string, unknown>
}
function string(value: unknown): string {
  return typeof value === 'string' ? value : invalid()
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : invalid()
}
function boolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalid()
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : invalid()
}
function version(value: unknown): string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : invalid()
}
export function validPath(value: unknown): value is string {
  // eslint-disable-next-line no-control-regex -- Mirror the transport path boundary without importing server runtime code.
  return typeof value === 'string' && value.length > 0 && value.length <= 1024 && !/[\u0000-\u001F\u007F\\:%]/.test(value) && value.split('/').every(part => !!part && part !== '.' && part !== '..')
}
function path(value: unknown): string {
  return validPath(value) ? value : invalid()
}
function kind(value: unknown): 'mermaid' | 'markdown' {
  return value === 'mermaid' || value === 'markdown' ? value : invalid()
}
function selector(value: unknown): DiagramSelector {
  const item = object(value)
  if (item.kind === 'standalone')
    return { kind: 'standalone' }
  if (item.kind === 'markdown' && typeof item.id === 'string' && /^md:\d+:\d+:\d+$/.test(item.id))
    return { kind: 'markdown', id: item.id }
  return invalid()
}
function summary(value: unknown): DiagramBlockSummary {
  const item = object(value)
  return { selector: selector(item.selector), label: string(item.label), lineStart: integer(item.lineStart, 1), lineEnd: integer(item.lineEnd, 1) }
}
export function decodeDocument(value: unknown): DiagramDocument {
  const item = object(value)
  return { path: path(item.path), kind: kind(item.kind), version: version(item.version), blocks: array(item.blocks).map((block): DiagramBlock => ({ ...summary(block), source: string(object(block).source) })) }
}
export function decodeSession(value: unknown): Session | { authenticated: false } {
  const item = object(value)
  if (item.authenticated === false)
    return { authenticated: false }
  if (item.authenticated !== true)
    return invalid()
  const storage = object(item.storage)
  // The UI uses writable capability, never a filesystem name as an admission rule.
  const capabilities = { pollIntervalMs: integer(item.pollIntervalMs, 1000, 30000), storage: { writable: boolean(storage.writable), filesystemType: string(storage.filesystemType), supportedFilesystem: string(storage.supportedFilesystem) }, maxSourceBytes: integer(item.maxSourceBytes, 1, absoluteSourceLimit) }
  if (item.access === 'open')
    return { authenticated: true, access: 'open', ...capabilities }
  if (item.access !== 'token')
    return invalid()
  const expiresAt = string(item.expiresAt)
  if (!Number.isFinite(Date.parse(expiresAt)))
    return invalid()
  return { authenticated: true, access: 'token', csrfToken: string(item.csrfToken), expiresAt, ...capabilities }
}
export function decodeTree(value: unknown): TreeSnapshot {
  const item = object(value)
  const entries = array(item.entries).map((entry): TreeEntry => {
    const file = object(entry)
    const relative = path(file.path)
    if (file.kind === 'directory')
      return { kind: 'directory', path: relative }
    if (file.kind !== 'file')
      return invalid()
    const fileKind = kind(file.fileKind)
    if (file.state === 'available')
      return { kind: 'file', path: relative, fileKind, state: 'available', version: version(file.version), blocks: array(file.blocks).map(summary) }
    if (file.state === 'unreadable' || file.state === 'too_large' || file.state === 'unsupported')
      return { kind: 'file', path: relative, fileKind, state: file.state, blocks: [] }
    return invalid()
  })
  return { entries, revision: version(item.revision), truncated: boolean(item.truncated), pollIntervalMs: integer(item.pollIntervalMs, 1000, 30000) }
}
export function decodeRevision(value: unknown): DocumentRevision {
  const item = object(value)
  if (item.state === 'deleted')
    return { path: path(item.path), state: 'deleted' }
  if (item.state === 'present')
    return { path: path(item.path), state: 'present', version: version(item.version) }
  return invalid()
}
export function decodeEntry(value: unknown): EntryChange {
  const item = object(value)
  return item.kind === 'file' || item.kind === 'directory' ? { kind: item.kind, path: path(item.path) } : invalid()
}
export const api = {
  session: (signal?: AbortSignal) => requestApi('/session', decodeSession, signal ? { signal } : {}),
  login: (token: string) => requestApi('/session', decodeSession, { method: 'POST', body: { token } }),
  logout: (csrfToken: string) => requestApi('/session', decodeSession, { method: 'DELETE', csrfToken }),
  tree: (signal: AbortSignal) => requestApi('/diagrams/tree', decodeTree, { signal }),
  document: (file: string, signal: AbortSignal) => requestApi(`/diagrams/document?path=${encodeURIComponent(file)}`, decodeDocument, { signal }),
  revision: (file: string, signal: AbortSignal) => requestApi(`/diagrams/revision?path=${encodeURIComponent(file)}`, decodeRevision, { signal }),
  save: (body: SaveDiagramRequest, csrfToken?: string) => requestApi('/diagrams/source', decodeDocument, { method: 'PUT', body, csrfToken }),
  createEntry: (body: CreateEntryRequest, csrfToken?: string) => requestApi('/diagrams/entries', decodeEntry, { method: 'POST', body, csrfToken }),
  moveEntry: (body: MoveEntryRequest, csrfToken?: string) => requestApi('/diagrams/entries/move', decodeEntry, { method: 'POST', body, csrfToken }),
  deleteEntry: (body: DeleteEntryRequest, csrfToken?: string) => requestApi('/diagrams/entries/delete', decodeEntry, { method: 'POST', body, csrfToken }),
}
export function entryErrorMessage(error: unknown): string {
  if (!(error instanceof HttpError))
    return 'Cannot reach the service. Reconnect and try again.'
  switch (error.code) {
    case 'exists': return 'An entry with that name already exists. Choose another name.'
    case 'not_empty': return 'This folder still contains files, including any the explorer does not show. Move or delete them first.'
    case 'not_found': return 'The destination folder does not exist.'
    case 'deleted': return 'This entry no longer exists. Refresh the file list.'
    case 'conflict': return 'This file changed outside the editor. Review it before moving or deleting it.'
    case 'forbidden': return 'This location cannot be used. Hidden names, excluded folders, links and other storage mounts are not allowed.'
    case 'unsupported': return 'Use a .mmd, .mermaid or .md file name.'
    case 'invalid_request': return 'Enter a valid path. A folder cannot move into itself, and a rename keeps the file type.'
    case 'filesystem_unsupported': return 'File changes are unavailable on this storage. Ask the operator to verify write support for this project.'
    case 'unauthorized': return 'Your session expired. Sign in again.'
    default: return error.message
  }
}
export function errorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.code === 'filesystem_unsupported')
      return 'Saving is unavailable on this storage. Your draft is kept. Ask the operator to verify write support for this project.'
    if (error.code === 'conflict')
      return 'This file changed outside the editor. Your draft is kept. Review the current file before saving.'
    if (error.code === 'deleted')
      return 'This file was deleted or renamed. Your draft is kept; it cannot recreate the file.'
    if (error.code === 'unauthorized')
      return 'Your session expired. Sign in again to recover your drafts.'
    return error.message
  }
  return 'Cannot reach the service. Your draft is kept. Reconnect and refresh before saving.'
}
