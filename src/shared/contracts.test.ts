import { describe, expect, test } from 'bun:test'
import { contentVersionSchema, createEntryRequestSchema, deleteEntryRequestSchema, diagramSelectorSchema, loginRequestSchema, moveEntryRequestSchema, readDocumentRequestSchema, relativePathSchema, saveDiagramRequestSchema } from './contracts'
import { AppError, errorStatus, safeError } from './errors'

const version = 'a'.repeat(64)
describe('transport boundaries', () => {
  test('accepts supported root-relative names without normalizing them', () => {
    for (const path of ['flow.mmd', 'docs/flow diagram.md', 'docs/.visible.mermaid'])
      expect(relativePathSchema.parse(path)).toBe(path)
    expect(readDocumentRequestSchema.parse({ path: 'file.md' })).toEqual({ path: 'file.md' })
  })
  test('rejects absolute, traversal, encoded, control and foreign separator paths', () => {
    for (const path of ['', '/etc/passwd', '../file.md', 'a/../b.md', './file.md', 'a//b.md', 'a/', 'C:/file.md', 'a\\b.md', '%2e%2e/file.md', '%252e/file.md', 'a\0.md', 'a\n.md'])
      expect(relativePathSchema.safeParse(path).success).toBe(false)
  })
  test('requires a full version and explicit selector on saves', () => {
    const request = { path: 'file.md', expectedVersion: version, selector: { kind: 'markdown' as const, id: 'md:0:20:40' }, source: 'flowchart TD\nA-->B' }
    expect(saveDiagramRequestSchema.parse(request)).toEqual(request)
    expect(saveDiagramRequestSchema.safeParse({ ...request, expectedVersion: 'mtime:123' }).success).toBe(false)
    expect(saveDiagramRequestSchema.safeParse({ ...request, selector: undefined }).success).toBe(false)
    expect(saveDiagramRequestSchema.safeParse({ ...request, force: true }).success).toBe(false)
    expect(saveDiagramRequestSchema.safeParse({ ...request, source: '' }).success).toBe(true)
    expect(diagramSelectorSchema.safeParse({ kind: 'standalone', id: 'x' }).success).toBe(false)
    expect(diagramSelectorSchema.safeParse({ kind: 'standalone' }).success).toBe(true)
    expect(contentVersionSchema.safeParse('A'.repeat(64)).success).toBe(false)
    expect(loginRequestSchema.safeParse({ token: 'short' }).success).toBe(false)
  })
  test('maps conflicts/deletions and redacts unexpected errors', () => {
    expect(errorStatus.conflict).toBe(409)
    expect(errorStatus.deleted).toBe(410)
    expect(errorStatus.unsupported).toBe(415)
    expect(new AppError('conflict', version).toResponse()).toMatchObject({ code: 'conflict', currentVersion: version })
    expect(new AppError('deleted', version).toResponse()).not.toHaveProperty('currentVersion')
    expect(safeError(new Error('/private/path SECRET')).toResponse()).toEqual({ code: 'internal_error', message: 'An unexpected error occurred.' })
    const error = new AppError('forbidden')
    expect(safeError(error)).toBe(error)
  })
  test('entry requests name their kind, carry no content and require versions only for files', () => {
    expect(createEntryRequestSchema.parse({ kind: 'file', path: 'docs/new.mmd' })).toEqual({ kind: 'file', path: 'docs/new.mmd' })
    expect(createEntryRequestSchema.safeParse({ kind: 'directory', path: 'docs/new' }).success).toBe(true)
    expect(createEntryRequestSchema.safeParse({ kind: 'file', path: '../new.mmd' }).success).toBe(false)
    expect(createEntryRequestSchema.safeParse({ kind: 'file', path: 'new.mmd', content: 'x' }).success).toBe(false)
    expect(moveEntryRequestSchema.safeParse({ kind: 'file', from: 'a.mmd', to: 'b.mmd' }).success).toBe(false)
    expect(moveEntryRequestSchema.safeParse({ kind: 'file', from: 'a.mmd', to: 'b.mmd', expectedVersion: version }).success).toBe(true)
    expect(moveEntryRequestSchema.safeParse({ kind: 'directory', from: 'a', to: 'b', expectedVersion: version }).success).toBe(false)
    expect(deleteEntryRequestSchema.safeParse({ kind: 'file', path: 'a.mmd' }).success).toBe(false)
    expect(deleteEntryRequestSchema.safeParse({ kind: 'directory', path: 'a' }).success).toBe(true)
    expect(deleteEntryRequestSchema.safeParse({ kind: 'link', path: 'a' }).success).toBe(false)
    expect([errorStatus.exists, errorStatus.not_empty]).toEqual([409, 409])
  })
})
