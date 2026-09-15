import type { ErrorCode, SaveDiagramRequest } from '../../shared/contracts'
import type { FileConfig, RepositoryHooks } from './repository'
import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { chmod, link, mkdir, readdir, readFile, rename, stat, symlink, unlink, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createFixtureService as createDiagramService, createFixture, removeFixture } from '../../../tests/integration/files/fixtures'
import { AppError } from '../../shared/errors'

let fixture: string
let root: string
let outside: string
let config: FileConfig
beforeEach(async () => {
  fixture = await createFixture('files-service-')
  root = join(fixture, 'project')
  outside = join(fixture, 'project-other')
  await mkdir(root)
  await mkdir(outside)
  await writeFile(join(root, 'diagram.mmd'), 'graph TD\nA-->B\n')
  await writeFile(join(outside, 'private.mmd'), 'outside-secret')
  config = { projectRoot: root, limits: { maxFileBytes: 2048, maxTreeEntries: 100, maxTreeDepth: 8, maxPathDepth: 64, maxBlocks: 20, pollIntervalMs: 1000, sessionTtlSeconds: 3600, maxSessions: 100 } }
})
afterEach(async () => {
  await removeFixture(fixture)
})

async function saveRequest(service: Awaited<ReturnType<typeof createDiagramService>>, path = 'diagram.mmd', source = 'graph LR\nX-->Y\n'): Promise<SaveDiagramRequest> {
  const document = await service.readDocument(path)
  return { path, selector: document.blocks[0]!.selector, expectedVersion: document.version, source }
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
    expect((error as Error).message).not.toContain('outside-secret')
  }
}
function gate() {
  let release: () => void = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

describe('contained real filesystem service', () => {
  test('reads, saves, preserves permissions and invalidates cached snapshots', async () => {
    await chmod(join(root, 'diagram.mmd'), 0o640)
    const service = await createDiagramService(config)
    const snapshot = await service.treeSnapshot()
    expect(snapshot.entries[0]).toMatchObject({ path: 'diagram.mmd', state: 'available' })
    const request = await saveRequest(service)
    const document = await service.saveDiagram(request)
    expect(document.blocks[0]?.source).toBe(request.source)
    expect((await stat(join(root, 'diagram.mmd'))).mode & 0o777).toBe(0o640)
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe(request.source)
    expect((await service.treeSnapshot()).revision).not.toBe(snapshot.revision)
    expect(await readdir(root)).toEqual(['diagram.mmd'])
  })

  test('whole-file versions protect other Markdown blocks and refreshed selectors', async () => {
    const original = '\uFEFFTitle\r\n```mermaid\r\ngraph TD\r\n```\r\nUnchanged\r\n~~~mermaid\r\nsecond\r\n~~~'
    await writeFile(join(root, 'notes.md'), original)
    const service = await createDiagramService(config)
    const document = await service.readDocument('notes.md')
    expect(document.text).toBe(original.replace(/^\uFEFF/, ''))
    const request = await saveRequest(service, 'notes.md', 'longer source')
    const saved = await service.saveDiagram(request)
    expect(saved.text).toBe(original.replace('graph TD\r\n', 'longer source\r\n').replace(/^\uFEFF/, ''))
    expect(saved.blocks[1]?.selector).not.toEqual(document.blocks[1]?.selector)
    expect(await readFile(join(root, 'notes.md'), 'utf8')).toBe(original.replace('graph TD\r\n', 'longer source\r\n'))
    await expectCode(service.saveDiagram({ ...request, selector: document.blocks[1]!.selector }), 'conflict')
    await expectCode(service.saveDiagram({ ...request, expectedVersion: saved.version }), 'invalid_request')
  })

  test.each(['../project-other/private.mmd', '/private.mmd', 'a/../../private.mmd', 'a//b.mmd', './diagram.mmd', 'a\\private.mmd', 'a\0.mmd', '%2e%2e/private.mmd', 'a%2fb.mmd', '%252e%252e/private.mmd', 'C:/private.mmd', 'a\n.mmd'])('rejects unsafe path %j', async (path) => {
    const service = await createDiagramService(config)
    await expectCode(service.readDocument(path), 'invalid_request')
    await expectCode(service.documentRevision(path), 'invalid_request')
    await expectCode(service.saveDiagram({ path, selector: { kind: 'standalone' }, expectedVersion: 'a'.repeat(64), source: 'bad' }), 'invalid_request')
    expect(await readFile(join(outside, 'private.mmd'), 'utf8')).toBe('outside-secret')
  })

  test('rejects file/directory/dangling/loop symlinks and hard links without following them', async () => {
    await symlink(join(outside, 'private.mmd'), join(root, 'file.mmd'))
    await symlink(outside, join(root, 'directory'))
    await symlink(join(outside, 'missing.mmd'), join(root, 'dangling.mmd'))
    await symlink('loop.mmd', join(root, 'loop.mmd'))
    await link(join(outside, 'private.mmd'), join(root, 'hard.mmd'))
    const service = await createDiagramService(config)
    for (const path of ['file.mmd', 'directory/private.mmd', 'dangling.mmd', 'loop.mmd', 'hard.mmd']) {
      await expectCode(service.readDocument(path), 'forbidden')
      await expectCode(service.saveDiagram({ path, selector: { kind: 'standalone' }, expectedVersion: 'a'.repeat(64), source: 'bad' }), 'forbidden')
    }
    const snapshot = await service.treeSnapshot()
    expect(JSON.stringify(snapshot)).not.toContain('outside-secret')
    expect(snapshot.entries.some(entry => entry.path === 'directory/private.mmd')).toBe(false)
    expect(await readFile(join(outside, 'private.mmd'), 'utf8')).toBe('outside-secret')
  })

  test('rejects noncanonical/symlink roots and root changes, including cached reads', async () => {
    await symlink(root, join(fixture, 'alias'))
    await expectCode(createDiagramService({ ...config, projectRoot: join(fixture, 'alias') }), 'unavailable')
    await expectCode(createDiagramService({ ...config, projectRoot: 'relative' }), 'unavailable')
    const service = await createDiagramService(config)
    await service.treeSnapshot()
    const request = await saveRequest(service)
    await rename(root, join(fixture, 'old-project'))
    await mkdir(root)
    await writeFile(join(root, 'diagram.mmd'), 'outside-secret')
    await expectCode(service.readDocument('diagram.mmd'), 'unavailable')
    await expectCode(service.saveDiagram(request), 'unavailable')
    await expectCode(service.treeSnapshot(), 'unavailable')
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe('outside-secret')
  })

  test('detects ancestor substitution after opening, before project data is read', async () => {
    await mkdir(join(root, 'docs'))
    await writeFile(join(root, 'docs', 'private.mmd'), 'inside')
    let reads = 0
    const hooks: RepositoryHooks = {
      afterDirectoryOpen: async (path) => {
        if (path === 'docs') {
          await rename(join(root, 'docs'), join(root, 'moved'))
          await symlink(outside, join(root, 'docs'))
        }
      },
      afterFileOpen: async () => { reads++ },
    }
    const service = await createDiagramService(config, { repositoryHooks: hooks })
    await expectCode(service.readDocument('docs/private.mmd'), 'forbidden')
    expect(reads).toBe(0)
  })

  test('detects a target swapped for a symlink after opening', async () => {
    let changed = false
    const service = await createDiagramService(config, { repositoryHooks: { afterFileOpen: async () => {
      if (!changed) {
        changed = true
        await unlink(join(root, 'diagram.mmd'))
        await symlink(join(outside, 'private.mmd'), join(root, 'diagram.mmd'))
      }
    } } })
    await expectCode(service.readDocument('diagram.mmd'), 'conflict')
    expect(await readFile(join(outside, 'private.mmd'), 'utf8')).toBe('outside-secret')
  })

  test('two concurrent saves using the same version yield one success and one conflict', async () => {
    const service = await createDiagramService(config)
    const request = await saveRequest(service)
    const results = await Promise.allSettled([service.saveDiagram(request), service.saveDiagram({ ...request, source: 'other' })])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    const failure = results.find(result => result.status === 'rejected')
    expect(failure?.status === 'rejected' && failure.reason instanceof AppError && failure.reason.code).toBe('conflict')
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe(request.source)
  })

  test('stale versions report the current full-file hash and release save locks', async () => {
    const service = await createDiagramService(config)
    const request = await saveRequest(service)
    await writeFile(join(root, 'diagram.mmd'), 'external')
    try {
      await service.saveDiagram(request)
      throw new Error('Expected a conflict')
    }
    catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).toResponse()).toMatchObject({ code: 'conflict', currentVersion: (await service.readDocument('diagram.mmd')).version })
    }
    const next = await saveRequest(service)
    expect((await service.saveDiagram(next)).blocks[0]?.source).toBe(next.source)
  })

  test('external edits during temporary preparation are preserved and temporary files removed', async () => {
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      await writeFile(join(root, 'diagram.mmd'), 'external edit')
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service)), 'conflict')
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe('external edit')
    expect(await readdir(root)).toEqual(['diagram.mmd'])
  })

  test('deletion during save does not recreate a missing target', async () => {
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      await unlink(join(root, 'diagram.mmd'))
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service)), 'deleted')
    expect(await readdir(root)).toEqual([])
  })

  test('same-content atomic target replacement during preparation still conflicts', async () => {
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      await writeFile(join(root, 'external.mmd'), 'graph TD\nA-->B\n')
      await rename(join(root, 'external.mmd'), join(root, 'diagram.mmd'))
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service)), 'conflict')
    expect(await readdir(root)).toEqual(['diagram.mmd'])
  })

  test('injected I/O failure after temp creation leaves original bytes and cleans the owned file', async () => {
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      throw new Error('simulated disk failure with private details')
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service)), 'unavailable')
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe('graph TD\nA-->B\n')
    expect(await readdir(root)).toEqual(['diagram.mmd'])
  })

  test('ancestor substitution during save cannot redirect commit outside root', async () => {
    await mkdir(join(root, 'docs'))
    await writeFile(join(root, 'docs', 'private.mmd'), 'inside')
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      await rename(join(root, 'docs'), join(root, 'retained'))
      await symlink(outside, join(root, 'docs'))
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service, 'docs/private.mmd')), 'forbidden')
    expect(await readFile(join(outside, 'private.mmd'), 'utf8')).toBe('outside-secret')
    expect(await readdir(join(root, 'retained'))).toEqual(['private.mmd'])
    expect(await readFile(join(root, 'retained', 'private.mmd'), 'utf8')).toBe('inside')
  })

  test('external readers observe complete old or new content around atomic replacement', async () => {
    const prepared = gate()
    const proceed = gate()
    const before = 'A'.repeat(1500)
    const after = 'B'.repeat(1900)
    await writeFile(join(root, 'diagram.mmd'), before)
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      prepared.release()
      await proceed.promise
    } } })
    const request = await saveRequest(service, 'diagram.mmd', after)
    const saving = service.saveDiagram(request)
    await prepared.promise
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe(before)
    const observations = Array.from({ length: 64 }, () => readFile(join(root, 'diagram.mmd'), 'utf8'))
    proceed.release()
    await saving
    const seen = await Promise.all(observations)
    seen.push(await readFile(join(root, 'diagram.mmd'), 'utf8'))
    expect(seen.every(content => content === before || content === after)).toBe(true)
    expect(seen).toContain(after)
    expect(await readdir(root)).toEqual(['diagram.mmd'])
  })

  test('rejects unsupported, binary, oversized and nonregular files and excessive source bytes', async () => {
    await writeFile(join(root, 'binary.mmd'), Buffer.from([0, 0xFF]))
    await writeFile(join(root, 'large.mmd'), 'x'.repeat(2049))
    await mkdir(join(root, 'directory.mmd'))
    execFileSync('mkfifo', [join(root, 'pipe.mmd')])
    const service = await createDiagramService(config)
    for (const path of ['binary.mmd', 'directory.mmd', 'pipe.mmd', 'file.txt'])
      await expectCode(service.readDocument(path), 'unsupported')
    await expectCode(service.readDocument('large.mmd'), 'too_large')
    await expectCode(service.saveDiagram(await saveRequest(service, 'diagram.mmd', 'λ'.repeat(1100))), 'too_large')
    await expectCode(service.saveDiagram({ ...await saveRequest(service), expectedVersion: 'invalid' }), 'invalid_request')
    const tree = await service.treeSnapshot()
    expect(tree.entries).toContainEqual({ kind: 'file', path: 'binary.mmd', fileKind: 'mermaid', state: 'unsupported', blocks: [] })
    expect(tree.entries).toContainEqual({ kind: 'file', path: 'large.mmd', fileKind: 'mermaid', state: 'too_large', blocks: [] })
  })

  test('explicit and cached snapshots detect same-size edits, additions, deletion and rename', async () => {
    let now = 0
    const service = await createDiagramService(config, { clock: () => now })
    const original = await service.treeSnapshot()
    const timestamp = await stat(join(root, 'diagram.mmd'))
    await writeFile(join(root, 'diagram.mmd'), 'graph TD\nA-->C\n')
    await utimes(join(root, 'diagram.mmd'), timestamp.atime, timestamp.mtime)
    expect((await service.treeSnapshot()).revision).toBe(original.revision)
    now = 1000
    const changed = await service.treeSnapshot()
    expect(changed.revision).not.toBe(original.revision)
    expect(await service.documentRevision('diagram.mmd')).toMatchObject({ state: 'present' })
    await writeFile(join(root, 'new.mermaid'), 'new')
    const added = await service.treeSnapshot({ refresh: true })
    expect(added.revision).not.toBe(changed.revision)
    await rename(join(root, 'new.mermaid'), join(root, 'renamed.mermaid'))
    expect(await service.documentRevision('new.mermaid')).toEqual({ path: 'new.mermaid', state: 'deleted' })
    expect(await service.documentRevision('renamed.mermaid')).toMatchObject({ state: 'present' })
    const renamed = await service.treeSnapshot({ refresh: true })
    expect(renamed.revision).not.toBe(added.revision)
    await unlink(join(root, 'diagram.mmd'))
    const deleted = await service.treeSnapshot({ refresh: true })
    expect(deleted.revision).not.toBe(renamed.revision)
    expect(deleted.entries.some(entry => entry.path === 'diagram.mmd')).toBe(false)
    await expectCode(service.readDocument('diagram.mmd'), 'deleted')
    original.entries.length = 0
    expect((await service.treeSnapshot()).entries).toHaveLength(1)
  })

  test('bounds entries, traversal work and depth; hides metadata but retains ordinary directories', async () => {
    for (const path of ['.git', 'node_modules', 'dist', 'target', '__pycache__', 'secrets', 'ordinary']) {
      await mkdir(join(root, path))
      await writeFile(join(root, path, 'a.mmd'), 'graph TD')
    }
    const service = await createDiagramService(config)
    const tree = await service.treeSnapshot()
    expect(tree.entries.map(entry => entry.path)).toEqual(['diagram.mmd', 'ordinary', 'ordinary/a.mmd'])
    await expectCode(service.readDocument('.git/a.mmd'), 'forbidden')
    await expectCode(service.readDocument('node_modules/a.mmd'), 'forbidden')
    await expectCode(service.readDocument('target/a.mmd'), 'forbidden')
    await expectCode(service.readDocument('__pycache__/a.mmd'), 'forbidden')
    const shallow = await createDiagramService({ ...config, limits: { ...config.limits, maxTreeDepth: 1 } })
    expect((await shallow.treeSnapshot()).truncated).toBe(true)
    expect((await shallow.readDocument('ordinary/a.mmd')).path).toBe('ordinary/a.mmd')
    expect((await shallow.saveDiagram({ ...await saveRequest(service, 'ordinary/a.mmd') })).path).toBe('ordinary/a.mmd')
    const small = await createDiagramService({ ...config, limits: { ...config.limits, maxTreeEntries: 1 } })
    expect((await small.treeSnapshot()).truncated).toBe(true)
    expect((await small.treeSnapshot()).entries.length).toBeLessThanOrEqual(1)
  })

  test('coalesces refresh and returns defensive copies', async () => {
    const service = await createDiagramService(config)
    const [a, b] = await Promise.all([service.treeSnapshot(), service.treeSnapshot()])
    expect(a).toEqual(b)
    a.entries.length = 0
    expect(b.entries).toHaveLength(1)
    expect((await service.treeSnapshot()).entries).toHaveLength(1)
  })
})

describe('additional replacement and traversal boundaries', () => {
  test('root deletion and symlink substitution are unavailable rather than document deletion', async () => {
    const service = await createDiagramService(config)
    const request = await saveRequest(service)
    await rename(root, join(fixture, 'retained-root'))
    await expectCode(service.documentRevision('diagram.mmd'), 'unavailable')
    await symlink(outside, root)
    await expectCode(service.readDocument('private.mmd'), 'unavailable')
    await expectCode(service.saveDiagram(request), 'unavailable')
    await expectCode(service.treeSnapshot({ refresh: true }), 'unavailable')
  })

  test('root substitution during save is rejected and only the owned temporary file is removed', async () => {
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      await rename(root, join(fixture, 'retained-root'))
      await symlink(outside, root)
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service)), 'unavailable')
    expect(await readFile(join(outside, 'private.mmd'), 'utf8')).toBe('outside-secret')
    expect(await readdir(join(fixture, 'retained-root'))).toEqual(['diagram.mmd'])
  })

  test('target substitution during save is rejected without touching its symlink destination', async () => {
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      await unlink(join(root, 'diagram.mmd'))
      await symlink(join(outside, 'private.mmd'), join(root, 'diagram.mmd'))
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service)), 'forbidden')
    expect(await readFile(join(outside, 'private.mmd'), 'utf8')).toBe('outside-secret')
    expect(await readdir(root)).toEqual(['diagram.mmd'])
  })

  test('does not unlink a replacement file at the temporary name after tampering', async () => {
    let substituted = ''
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      substituted = (await readdir(root)).find(name => name.startsWith('.merdeck-'))!
      await rename(join(root, substituted), join(root, 'retained-temp'))
      await writeFile(join(root, substituted), 'replacement owned elsewhere')
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service)), 'forbidden')
    expect(await readFile(join(root, substituted), 'utf8')).toBe('replacement owned elsewhere')
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe('graph TD\nA-->B\n')
  })

  test('bounded scans count excluded entries and identify truncated output', async () => {
    await unlink(join(root, 'diagram.mmd'))
    for (let index = 0; index < 20; index++)
      await writeFile(join(root, `${index}.txt`), '')
    const service = await createDiagramService({ ...config, limits: { ...config.limits, maxTreeEntries: 1 } })
    const tree = await service.treeSnapshot()
    expect(tree.entries).toEqual([])
    expect(tree.truncated).toBe(true)
  })

  test('unreadable descendants mark a partial snapshot and can recover on refresh', async () => {
    await mkdir(join(root, 'nested'))
    await writeFile(join(root, 'nested', 'document.mmd'), 'source')
    let replaced = false
    const service = await createDiagramService(config, { repositoryHooks: { afterDirectoryOpen: async (path) => {
      if (path === 'nested' && !replaced) {
        replaced = true
        await rename(join(root, 'nested'), join(root, 'retained'))
        await symlink(outside, join(root, 'nested'))
      }
    } } })
    expect((await service.treeSnapshot()).truncated).toBe(true)
    await unlink(join(root, 'nested'))
    await rename(join(root, 'retained'), join(root, 'nested'))
    expect((await service.treeSnapshot({ refresh: true })).truncated).toBe(false)
  })

  test('snapshot total hash budget is bounded independently of the entry limit', async () => {
    // A timed-out body may outlive module hooks and must retain its own fixture.
    const testConfig = config
    const testRoot = await createFixture('files-hash-budget-')
    try {
      await writeFile(join(testRoot, 'diagram.mmd'), 'graph TD\nA-->B\n')
      const large = Buffer.alloc(8 * 1024 * 1024, 65)
      for (let index = 0; index < 5; index++)
        await writeFile(join(testRoot, `large-${index}.mmd`), large)
      const service = await createDiagramService({ ...testConfig, projectRoot: testRoot, limits: { ...testConfig.limits, maxFileBytes: large.length } })
      const tree = await service.treeSnapshot()
      expect(tree.truncated).toBe(true)
      expect(tree.entries.length).toBeLessThan(6)
      expect((await service.readDocument('large-4.mmd')).blocks[0]?.source.length).toBe(large.length)
    }
    finally {
      await removeFixture(testRoot)
    }
  })
})

describe('refresh and resource lifecycle', () => {
  test('same-size invalid text changes affect the tree revision without exposing source', async () => {
    await writeFile(join(root, 'invalid.mmd'), Buffer.from([0, 1]))
    const service = await createDiagramService(config)
    const first = await service.treeSnapshot()
    await writeFile(join(root, 'invalid.mmd'), Buffer.from([0, 2]))
    const second = await service.treeSnapshot({ refresh: true })
    expect(second.revision).not.toBe(first.revision)
    expect(second.entries).toEqual(first.entries)
  })

  test('external temporary deletion is a typed failure and does not mask cleanup', async () => {
    const service = await createDiagramService(config, { repositoryHooks: { afterTempWrite: async () => {
      const temporary = (await readdir(root)).find(name => name.startsWith('.merdeck-'))!
      await unlink(join(root, temporary))
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service)), 'deleted')
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe('graph TD\nA-->B\n')
    expect(await readdir(root)).toEqual(['diagram.mmd'])
  })

  test('a save during a tree refresh prevents that in-flight snapshot from being cached', async () => {
    await writeFile(join(root, 'z.mmd'), 'z')
    const paused = gate()
    const resume = gate()
    let pause = true
    const service = await createDiagramService(config, { repositoryHooks: { afterFileOpen: async (path) => {
      if (pause && path === 'z.mmd') {
        pause = false
        paused.release()
        await resume.promise
      }
    } } })
    const request = await saveRequest(service)
    const refreshing = service.treeSnapshot()
    await paused.promise
    const saved = await service.saveDiagram(request)
    resume.release()
    await refreshing
    const next = await service.treeSnapshot()
    expect(next.entries.find(entry => entry.path === 'diagram.mmd')).toMatchObject({ version: saved.version })
  })
})

describe('filesystem failure handling', () => {
  test('a partial temporary write followed by an injected disk error preserves the destination', async () => {
    let wrotePartial = false
    const service = await createDiagramService(config, { repositoryHooks: { writeTemporary: async (handle, bytes) => {
      await handle.writeFile(bytes.subarray(0, 4))
      wrotePartial = true
      expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe('graph TD\nA-->B\n')
      throw Object.assign(new Error('Injected storage exhaustion'), { code: 'ENOSPC' })
    } } })
    await expectCode(service.saveDiagram(await saveRequest(service)), 'unavailable')
    expect(wrotePartial).toBe(true)
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe('graph TD\nA-->B\n')
    expect(await readdir(root)).toEqual(['diagram.mmd'])
  })

  test('permission-denied I/O yields safe errors and unreadable tree state', async () => {
    const service = await createDiagramService(config, { repositoryHooks: { afterFileOpen: async () => {
      throw Object.assign(new Error('Injected permission denial with private details'), { code: 'EACCES' })
    } } })
    await expectCode(service.readDocument('diagram.mmd'), 'forbidden')
    expect((await service.treeSnapshot()).entries[0]).toMatchObject({ state: 'unreadable' })
    expect(await readFile(join(root, 'diagram.mmd'), 'utf8')).toBe('graph TD\nA-->B\n')
    expect(await readdir(root)).toEqual(['diagram.mmd'])
  })
})
