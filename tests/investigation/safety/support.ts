import type { AppConfig } from '../../../src/config'
import type { DiagramDocument, SaveDiagramRequest } from '../../../src/shared/contracts'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

export const baseline = 'b314a1268f88be3ace1ccbd64ca9ab028044a117'
export const original = 'graph TD\nA-->B\n'
export const external = 'graph LR\nExternal-->Version\n'
export const proposed = 'graph TD\nLocal-->Draft\n'
export const later = 'graph LR\nLater-->Writer\n'
export const project = resolve(import.meta.dir, '../../..')
export const scratch = resolve(project, 'tmp/safety')
export function hash(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex')
}
export function inside(base: string, path: string): void {
  const rel = relative(base, path)
  assert(rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith('../'), 'Path must be a scratch descendant')
}
export async function safeScratch(): Promise<void> {
  for (const dir of [resolve(project, 'tmp'), scratch]) {
    assert(!(await lstat(dir)).isSymbolicLink(), 'Scratch directory must not be a symlink')
    assert.equal(await realpath(dir), dir)
  }
}
export async function safeActorPath(base: string, path: string): Promise<void> {
  inside(scratch, base)
  assert.equal(await realpath(base), base)
  inside(base, path)
  const parent = await realpath(dirname(path))
  if (parent !== base)
    inside(base, parent)
  const entry = await lstat(path).catch((error: unknown) => {
    if (errorCode(error) === 'ENOENT')
      return undefined
    throw error
  })
  assert(!entry?.isSymbolicLink(), 'Actor paths must not be symlinks')
}
export function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'
}
export async function absent(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return false
  }
  catch (error) {
    if (errorCode(error) !== 'ENOENT')
      throw error
    return true
  }
}
export async function snapshot(path: string) {
  try {
    const stat = await lstat(path, { bigint: true })
    return { exists: true, hash: stat.isFile() ? hash(await readFile(path)) : null, dev: String(stat.dev), ino: String(stat.ino), nlink: String(stat.nlink), size: Number(stat.size), mode: Number(stat.mode & 0o777n) }
  }
  catch (error) {
    if (errorCode(error) !== 'ENOENT')
      throw error
    return { exists: false, hash: null, dev: null, ino: null, nlink: null, size: 0, mode: null }
  }
}
export type Snapshot = Awaited<ReturnType<typeof snapshot>>
export interface Hooks {
  afterTempWrite?: (path: string) => Promise<void>
  afterDirectoryOpen?: (path: string) => Promise<void>
  afterFileOpen?: (path: string) => Promise<void>
}
export interface Service {
  readDocument: (path: string) => Promise<DiagramDocument>
  saveDiagram: (request: SaveDiagramRequest) => Promise<DiagramDocument>
}
export interface BaselineModule {
  createDiagramService: (config: Pick<AppConfig, 'projectRoot' | 'limits'>, options?: { repositoryHooks: Hooks }) => Promise<Service>
}
export const schedule: { hit: (point: string) => Promise<void> } = { hit: async () => {} }
export function config(projectRoot: string): Pick<AppConfig, 'projectRoot' | 'limits'> {
  return { projectRoot, limits: { maxFileBytes: 4096, maxTreeEntries: 20, maxTreeDepth: 8, maxBlocks: 8, pollIntervalMs: 1000, sessionTtlSeconds: 3600, maxSessions: 10 } }
}
export interface Evidence {
  id: string
  classification: 'loss-diagnostic' | 'containment-diagnostic' | 'control-assertion' | 'candidate-diagnostic' | 'capability-observation'
  [key: string]: unknown
}
