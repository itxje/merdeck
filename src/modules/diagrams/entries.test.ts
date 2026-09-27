import type { ErrorCode } from '../../shared/contracts'
import type { RepositoryHooks } from './repository'
import { link, mkdir, readdir, readFile, stat, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createFixtureService as createDiagramService, createFixture, removeFixture } from '../../../tests/integration/files/fixtures'
import { AppError } from '../../shared/errors'

let fixture: string
let root: string
let outside: string
const limits = { maxFileBytes: 2048, maxTreeEntries: 100, maxTreeDepth: 4, maxPathDepth: 64, maxBlocks: 20, pollIntervalMs: 1000, sessionTtlSeconds: 3600, maxSessions: 100 }
const flow = 'graph TD\nA-->B\n'

beforeEach(async () => {
  fixture = await createFixture('files-entries-')
  root = join(fixture, 'project')
  outside = join(fixture, 'outside')
  await mkdir(join(root, 'docs'), { recursive: true })
  await mkdir(outside)
  await writeFile(join(root, 'flow.mmd'), flow)
  await writeFile(join(outside, 'private.mmd'), 'outside-secret')
})
afterEach(async () => {
  await removeFixture(fixture)
})

function service(hooks: RepositoryHooks = {}) {
  return createDiagramService({ projectRoot: root, limits }, { repositoryHooks: hooks })
}
async function expectCode(operation: Promise<unknown>, code: ErrorCode) {
  try {
    await operation
    throw new Error('Expected a domain error')
  }
  catch (error) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe(code)
    expect((error as Error).message).not.toContain(fixture)
  }
}

describe('contained file and folder operations', () => {
  test('creates template files and folders without replacing existing names', async () => {
    const diagrams = await service()
    const before = await diagrams.treeSnapshot()
    expect(await diagrams.createEntry({ kind: 'file', path: 'docs/new.mmd' })).toEqual({ kind: 'file', path: 'docs/new.mmd' })
    expect(await diagrams.createEntry({ kind: 'file', path: 'docs/notes.md' })).toEqual({ kind: 'file', path: 'docs/notes.md' })
    expect(await diagrams.createEntry({ kind: 'directory', path: 'docs/drafts' })).toEqual({ kind: 'directory', path: 'docs/drafts' })
    expect((await diagrams.readDocument('docs/new.mmd')).blocks).toHaveLength(1)
    expect((await diagrams.readDocument('docs/notes.md')).blocks).toHaveLength(1)
    expect((await stat(join(root, 'docs', 'drafts'))).isDirectory()).toBe(true)
    const after = await diagrams.treeSnapshot()
    expect(after.revision).not.toBe(before.revision)
    expect(after.entries.map(entry => entry.path)).toEqual(expect.arrayContaining(['docs/drafts', 'docs/new.mmd', 'docs/notes.md']))
    await writeFile(join(root, 'docs', 'taken.mmd'), 'external\n')
    await symlink(join(outside, 'private.mmd'), join(root, 'docs', 'link.mmd'))
    await expectCode(diagrams.createEntry({ kind: 'file', path: 'docs/taken.mmd' }), 'exists')
    await expectCode(diagrams.createEntry({ kind: 'file', path: 'docs/link.mmd' }), 'exists')
    await expectCode(diagrams.createEntry({ kind: 'directory', path: 'docs/new.mmd' }), 'exists')
    await expectCode(diagrams.createEntry({ kind: 'directory', path: 'docs' }), 'exists')
    expect(await readFile(join(root, 'docs', 'taken.mmd'), 'utf8')).toBe('external\n')
    expect(await readFile(join(outside, 'private.mmd'), 'utf8')).toBe('outside-secret')
  })

  test('creates read-only HTML templates and permits only HTML-to-HTML suffix moves', async () => {
    const diagrams = await service()
    await diagrams.createEntry({ kind: 'file', path: 'docs/page.html' })
    const original = await diagrams.readDocument('docs/page.html')
    expect(original).toMatchObject({ kind: 'html', path: 'docs/page.html', blocks: [] })
    expect(original.kind === 'html' && original.text).toContain('<!doctype html>')
    expect(await readFile(join(root, 'docs', 'page.html'), 'utf8')).toBe(original.kind === 'html' ? original.text : '')
    await expectCode(diagrams.saveDiagram({ path: original.path, selector: { kind: 'standalone' }, expectedVersion: original.version, source: '<h1>Changed</h1>' }), 'unsupported')
    expect(await diagrams.moveEntry({ kind: 'file', from: original.path, to: 'docs/page.htm', expectedVersion: original.version })).toEqual({ kind: 'file', path: 'docs/page.htm' })
    const moved = await diagrams.readDocument('docs/page.htm')
    expect(moved).toMatchObject({ kind: 'html', version: original.version, blocks: [] })
    await expectCode(diagrams.moveEntry({ kind: 'file', from: moved.path, to: 'docs/page.md', expectedVersion: moved.version }), 'invalid_request')
  })

  test('refuses unsafe, excluded, unsupported, too deep and missing-parent entries', async () => {
    const diagrams = await service()
    await symlink(outside, join(root, 'escape'))
    const cases: [() => Promise<unknown>, ErrorCode][] = [
      [() => diagrams.createEntry({ kind: 'file', path: '../outside/new.mmd' }), 'invalid_request'],
      [() => diagrams.createEntry({ kind: 'file', path: '.hidden.mmd' }), 'forbidden'],
      [() => diagrams.createEntry({ kind: 'directory', path: 'node_modules' }), 'forbidden'],
      [() => diagrams.createEntry({ kind: 'file', path: 'docs/build/new.mmd' }), 'forbidden'],
      [() => diagrams.createEntry({ kind: 'file', path: 'new.txt' }), 'unsupported'],
      [() => diagrams.createEntry({ kind: 'file', path: `${'a/'.repeat(64)}new.mmd` }), 'forbidden'],
      [() => diagrams.createEntry({ kind: 'directory', path: `${'a/'.repeat(64)}folder` }), 'forbidden'],
      [() => diagrams.createEntry({ kind: 'file', path: 'missing/new.mmd' }), 'not_found'],
      [() => diagrams.createEntry({ kind: 'directory', path: 'missing/folder' }), 'not_found'],
      [() => diagrams.createEntry({ kind: 'file', path: 'escape/new.mmd' }), 'forbidden'],
      [() => diagrams.createEntry({ kind: 'file', path: 'flow.mmd/new.mmd' }), 'forbidden'],
    ]
    for (const [operation, code] of cases)
      await expectCode(operation(), code)
    expect(await readdir(outside)).toEqual(['private.mmd'])
    expect((await readdir(root)).sort()).toEqual(['docs', 'escape', 'flow.mmd'])
  })

  test('moves files within and across folders and never replaces an existing destination', async () => {
    const diagrams = await service()
    const original = await diagrams.readDocument('flow.mmd')
    await expectCode(diagrams.moveEntry({ kind: 'file', from: 'flow.mmd', to: 'docs/flow.mmd', expectedVersion: 'a'.repeat(64) }), 'conflict')
    expect(await diagrams.moveEntry({ kind: 'file', from: 'flow.mmd', to: 'docs/flow.mermaid', expectedVersion: original.version })).toEqual({ kind: 'file', path: 'docs/flow.mermaid' })
    expect(await readdir(root)).toEqual(['docs'])
    const moved = await diagrams.readDocument('docs/flow.mermaid')
    expect(moved.version).toBe(original.version)
    expect((await stat(join(root, 'docs', 'flow.mermaid'))).nlink).toBe(1)
    await writeFile(join(root, 'docs', 'taken.mmd'), 'external\n')
    await expectCode(diagrams.moveEntry({ kind: 'file', from: 'docs/flow.mermaid', to: 'docs/taken.mmd', expectedVersion: moved.version }), 'exists')
    expect(await readFile(join(root, 'docs', 'taken.mmd'), 'utf8')).toBe('external\n')
    expect(await readFile(join(root, 'docs', 'flow.mermaid'), 'utf8')).toBe(flow)
    await expectCode(diagrams.moveEntry({ kind: 'file', from: 'docs/flow.mermaid', to: 'docs/flow.md', expectedVersion: moved.version }), 'invalid_request')
    await expectCode(diagrams.moveEntry({ kind: 'file', from: 'docs/flow.mermaid', to: 'docs/flow.mermaid', expectedVersion: moved.version }), 'invalid_request')
    await expectCode(diagrams.moveEntry({ kind: 'file', from: 'docs/missing.mmd', to: 'docs/other.mmd', expectedVersion: moved.version }), 'deleted')
    await expectCode(diagrams.moveEntry({ kind: 'file', from: 'docs/flow.mermaid', to: 'missing/flow.mmd', expectedVersion: moved.version }), 'not_found')
    await expectCode(diagrams.moveEntry({ kind: 'file', from: 'docs/flow.mermaid', to: '.hidden/flow.mmd', expectedVersion: moved.version }), 'forbidden')
    await link(join(root, 'docs', 'taken.mmd'), join(outside, 'hard.mmd'))
    await expectCode(diagrams.moveEntry({ kind: 'file', from: 'docs/taken.mmd', to: 'docs/free.mmd', expectedVersion: 'a'.repeat(64) }), 'forbidden')
    expect((await readdir(join(root, 'docs'))).sort()).toEqual(['flow.mermaid', 'taken.mmd'])
  })

  test('moves folders with their contents and refuses occupied or nested destinations', async () => {
    const diagrams = await service()
    await writeFile(join(root, 'docs', 'inside.md'), '# Inside\n')
    await writeFile(join(root, 'docs', '.hidden-note'), 'kept\n')
    expect(await diagrams.moveEntry({ kind: 'directory', from: 'docs', to: 'guides' })).toEqual({ kind: 'directory', path: 'guides' })
    expect((await readdir(join(root, 'guides'))).sort()).toEqual(['.hidden-note', 'inside.md'])
    await mkdir(join(root, 'empty'))
    await expectCode(diagrams.moveEntry({ kind: 'directory', from: 'guides', to: 'empty' }), 'exists')
    expect(await readdir(join(root, 'empty'))).toEqual([])
    await expectCode(diagrams.moveEntry({ kind: 'directory', from: 'guides', to: 'flow.mmd' }), 'exists')
    await expectCode(diagrams.moveEntry({ kind: 'directory', from: 'guides', to: 'guides/nested' }), 'invalid_request')
    await expectCode(diagrams.moveEntry({ kind: 'directory', from: 'missing', to: 'other' }), 'deleted')
    await symlink(outside, join(root, 'escape'))
    await expectCode(diagrams.moveEntry({ kind: 'directory', from: 'escape', to: 'inside' }), 'forbidden')
    expect(await readdir(outside)).toEqual(['private.mmd'])
    expect((await readdir(root)).sort()).toEqual(['empty', 'escape', 'flow.mmd', 'guides'])
  })

  test('deletes files only at the expected version and folders only when empty', async () => {
    const diagrams = await service()
    const document = await diagrams.readDocument('flow.mmd')
    await expectCode(diagrams.deleteEntry({ kind: 'file', path: 'flow.mmd', expectedVersion: 'a'.repeat(64) }), 'conflict')
    expect(await readFile(join(root, 'flow.mmd'), 'utf8')).toBe(flow)
    expect(await diagrams.deleteEntry({ kind: 'file', path: 'flow.mmd', expectedVersion: document.version })).toEqual({ kind: 'file', path: 'flow.mmd' })
    await expectCode(diagrams.deleteEntry({ kind: 'file', path: 'flow.mmd', expectedVersion: document.version }), 'deleted')
    await writeFile(join(root, 'docs', '.hidden-note'), 'kept\n')
    await expectCode(diagrams.deleteEntry({ kind: 'directory', path: 'docs' }), 'not_empty')
    expect(await readFile(join(root, 'docs', '.hidden-note'), 'utf8')).toBe('kept\n')
    await mkdir(join(root, 'empty'))
    expect(await diagrams.deleteEntry({ kind: 'directory', path: 'empty' })).toEqual({ kind: 'directory', path: 'empty' })
    await symlink(outside, join(root, 'escape'))
    await expectCode(diagrams.deleteEntry({ kind: 'directory', path: 'escape' }), 'forbidden')
    await expectCode(diagrams.deleteEntry({ kind: 'directory', path: 'missing' }), 'deleted')
    expect(await readdir(outside)).toEqual(['private.mmd'])
    expect((await readdir(root)).sort()).toEqual(['docs', 'escape'])
  })

  test('structural operations wait for an in-flight save and then see its version', async () => {
    let resume: () => void = () => {}
    const paused = new Promise<void>((resolve) => {
      resume = resolve
    })
    let started: () => void = () => {}
    const writing = new Promise<void>((resolve) => {
      started = resolve
    })
    const diagrams = await service({
      afterTempWrite: async () => {
        started()
        await paused
      },
    })
    const document = await diagrams.readDocument('flow.mmd')
    const save = diagrams.saveDiagram({ path: 'flow.mmd', selector: document.blocks[0]!.selector, expectedVersion: document.version, source: 'graph LR\nSaved-->First\n' })
    await writing
    let settled = false
    const move = diagrams.moveEntry({ kind: 'file', from: 'flow.mmd', to: 'docs/flow.mmd', expectedVersion: document.version }).finally(() => {
      settled = true
    })
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(settled).toBe(false)
    resume()
    const saved = await save
    await expectCode(move, 'conflict')
    expect(await readFile(join(root, 'flow.mmd'), 'utf8')).toBe('graph LR\nSaved-->First\n')
    expect(await diagrams.moveEntry({ kind: 'file', from: 'flow.mmd', to: 'docs/flow.mmd', expectedVersion: saved.version })).toEqual({ kind: 'file', path: 'docs/flow.mmd' })
    expect(await readdir(root)).toEqual(['docs'])
  })
})
