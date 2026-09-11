import { z } from 'zod'

// Paths are decoded once by HTTP transport. Filesystem containment is a separate check.
export const relativePathSchema = z.string().min(1).max(1024).refine(value =>
  // eslint-disable-next-line no-control-regex -- Control characters are forbidden in project paths.
  !/[\u0000-\u001F\u007F\\:%]/.test(value)
  && value.split('/').every(part => part !== '' && part !== '.' && part !== '..'),
)
export const contentVersionSchema = z.string().regex(/^[a-f0-9]{64}$/)
export const diagramSelectorSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('standalone') }),
  z.strictObject({ kind: z.literal('markdown'), id: z.string().regex(/^md:\d+:\d+:\d+$/) }),
])
export const readDocumentRequestSchema = z.strictObject({ path: relativePathSchema })
export const saveDiagramRequestSchema = z.strictObject({
  path: relativePathSchema,
  selector: diagramSelectorSchema,
  expectedVersion: contentVersionSchema,
  source: z.string().max(8 * 1024 * 1024),
})
export const createEntryRequestSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('file'), path: relativePathSchema }),
  z.strictObject({ kind: z.literal('directory'), path: relativePathSchema }),
])
export const moveEntryRequestSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('file'), from: relativePathSchema, to: relativePathSchema, expectedVersion: contentVersionSchema }),
  z.strictObject({ kind: z.literal('directory'), from: relativePathSchema, to: relativePathSchema }),
])
export const deleteEntryRequestSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('file'), path: relativePathSchema, expectedVersion: contentVersionSchema }),
  z.strictObject({ kind: z.literal('directory'), path: relativePathSchema }),
])
export const loginRequestSchema = z.strictObject({ token: z.string().min(32).max(256) })

export type RelativePath = z.infer<typeof relativePathSchema>
export type ContentVersion = z.infer<typeof contentVersionSchema>
export type DiagramSelector = z.infer<typeof diagramSelectorSchema>
export type ReadDocumentRequest = z.infer<typeof readDocumentRequestSchema>
export type SaveDiagramRequest = z.infer<typeof saveDiagramRequestSchema>
export type CreateEntryRequest = z.infer<typeof createEntryRequestSchema>
export type MoveEntryRequest = z.infer<typeof moveEntryRequestSchema>
export type DeleteEntryRequest = z.infer<typeof deleteEntryRequestSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type FileKind = 'mermaid' | 'markdown'

export interface DiagramBlockSummary {
  selector: DiagramSelector
  label: string
  lineStart: number
  lineEnd: number
}
export interface DiagramBlock extends DiagramBlockSummary {
  source: string
}
export interface DiagramDocument {
  path: RelativePath
  kind: FileKind
  version: ContentVersion
  blocks: DiagramBlock[]
}
export type TreeEntry
  = | { kind: 'directory', path: RelativePath }
    | { kind: 'file', path: RelativePath, fileKind: FileKind, state: 'available', version: ContentVersion, blocks: DiagramBlockSummary[] }
    | { kind: 'file', path: RelativePath, fileKind: FileKind, state: 'unreadable' | 'too_large' | 'unsupported', blocks: [] }

export interface TreeSnapshot {
  revision: ContentVersion
  entries: TreeEntry[]
  truncated: boolean
  pollIntervalMs: number
}
export type DocumentRevision
  = | { path: RelativePath, state: 'present', version: ContentVersion }
    | { path: RelativePath, state: 'deleted' }
export interface EntryChange {
  kind: 'file' | 'directory'
  path: RelativePath
}

export interface SessionCapabilities {
  pollIntervalMs: number
  maxSourceBytes: number
  storage: { writable: boolean, filesystemType: string, supportedFilesystem: string }
}
// `open` is reported by a service that runs without an access token and therefore has no session or CSRF token.
export type SessionStatus
  = | { authenticated: false }
    | ({ authenticated: true, access: 'token', csrfToken: string, expiresAt: string } & SessionCapabilities)
    | ({ authenticated: true, access: 'open' } & SessionCapabilities)

export type ErrorCode = 'invalid_request' | 'method_not_allowed' | 'unsupported_media_type' | 'unauthorized' | 'forbidden' | 'not_found' | 'deleted' | 'conflict' | 'exists' | 'not_empty' | 'unsupported' | 'filesystem_unsupported' | 'too_large' | 'rate_limited' | 'unavailable' | 'internal_error'
export interface ApiError {
  code: ErrorCode
  message: string
  currentVersion?: ContentVersion
}
export type ApiResult<T> = { success: true, data: T } | { success: false, error: ApiError }
export interface HealthStatus {
  status: 'ok'
  service: 'merdeck'
}
/** Public identity of the frontend build a service serves; `null` without a built interface. */
export interface ApplicationBuild {
  identity: string | null
  pollIntervalMs: number
}
