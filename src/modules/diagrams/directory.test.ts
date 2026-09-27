import type { DirectoryPage } from '../../shared/contracts'
import type { DiagramService, DiagramServiceOptions } from './service'
import { Buffer } from 'node:buffer'
import { chmod, link, mkdir, opendir, readdir, readlink, rename, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, expect, test } from 'bun:test'
import { createFixture, fixtureLimits, removeFixture } from '../../../tests/integration/files/fixtures'
import { createDiagramService } from './service'

const services: DiagramService[] = []
const roots: string[] = []
const context = { origin: 'http://localhost:8787', principal: 'open', expiresAt: null }
async function fixture() {
  const root = await createFixture('files-directory-')
  roots.push(root)
  return root
}
async function service(root: string, options: DiagramServiceOptions = {}, maxPathDepth = 64) {
  const result = await createDiagramService({ projectRoot: root, limits: { ...fixtureLimits, maxTreeDepth: 1, maxTreeEntries: 1, maxPathDepth } }, options)
  services.push(result)
  return result
}
afterEach(async () => {
  for (const value of services.splice(0))
    await value.close()
  for (const root of roots.splice(0))
    await removeFixture(root)
})

test('pinned directory stream resumes explicit reads and closes explicitly', async () => {
  expect(Bun.version).toBe('1.4.2')
  const root = await fixture()
  for (const name of ['a', 'b', 'c'])
    await writeFile(join(root, name), '')
  const stream = await opendir(root, { bufferSize: 1 })
  const first = await stream.read()
  await Promise.resolve()
  const second = await stream.read()
  const third = await stream.read()
  expect(new Set([first?.name, second?.name, third?.name]).size).toBe(3)
  expect(await stream.read()).toBeNull()
  await stream.close()
  await expect(stream.read()).rejects.toThrow()
})

test('nested metadata listing is independent of legacy root and content budgets', async () => {
  const root = await fixture()
  await mkdir(join(root, 'selected/deep'), { recursive: true })
  await mkdir(join(root, 'unrelated'))
  for (let i = 0; i < 20; i++)
    await writeFile(join(root, `unrelated/${i}.md`), 'x'.repeat(10000))
  await writeFile(join(root, 'selected/deep/large.md'), 'x'.repeat(10000))
  await writeFile(join(root, 'selected/deep/empty.md'), '')
  const diagrams = await service(root)
  const page: DirectoryPage = await diagrams.directoryPage({ path: 'selected/deep', limit: 100 }, context)
  expect(page.complete).toBe(true)
  expect(page.entries.map(entry => entry.path).sort()).toEqual(['selected/deep/empty.md', 'selected/deep/large.md'])
  expect(page.entries.every(entry => entry.kind === 'file' && entry.state === 'deferred' && !('blocks' in entry))).toBe(true)
  expect(page.parent).toBe('selected')
  expect((await diagrams.treeSnapshot()).truncated).toBe(true)
})

test('direct read and save are independent of legacy scan depth', async () => {
  const root = await fixture()
  const path = 'a/b/c/d/e/file.mmd'
  await mkdir(join(root, 'a/b/c/d/e'), { recursive: true })
  await writeFile(join(root, path), 'graph TD\nA-->B\n')
  const diagrams = await service(root)
  const document = await diagrams.readDocument(path)
  const saved = await diagrams.saveDiagram({ path, expectedVersion: document.version, selector: { kind: 'standalone' }, source: 'graph LR\nB-->C\n' })
  expect(saved.blocks[0]?.source).toBe('graph LR\nB-->C\n')
})

function gate() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}
async function files(root: string, count = 3, prefix = '') {
  for (let i = 0; i < count; i++)
    await writeFile(join(root, `${prefix}${i}.md`), '')
}
async function next(diagrams: DiagramService, page: DirectoryPage) {
  return diagrams.directoryPage({ path: page.path, limit: page.limit, cursor: page.nextCursor! }, context)
}

test('single-use cursors bind path, limit, principal and origin without consuming on misuse', async () => {
  const root = await fixture()
  await files(root)
  const diagrams = await service(root)
  const page = await diagrams.directoryPage({ path: '', limit: 1 }, context)
  const request = { path: '', limit: 1, cursor: page.nextCursor! }
  for (const changed of [{ ...request, path: 'other' }, { ...request, limit: 2 }])
    await expect(diagrams.directoryPage(changed, context)).rejects.toMatchObject({ code: 'invalid_request' })
  for (const changed of [{ ...context, principal: 'another' }, { ...context, origin: 'http://other.test' }])
    await expect(diagrams.directoryPage(request, changed)).rejects.toMatchObject({ code: 'forbidden' })
  const results = await Promise.allSettled([diagrams.directoryPage(request, context), diagrams.directoryPage(request, context)])
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect(results.filter(result => result.status === 'rejected').map(result => result.reason.code)).toEqual(['cursor_stale'])
  await expect(diagrams.directoryPage(request, context)).rejects.toMatchObject({ code: 'cursor_stale' })
})

test('empty, excluded-only and byte-limited pages preserve forward traversal', async () => {
  const root = await fixture()
  await mkdir(join(root, 'empty'))
  await files(root, 1100, '.')
  await files(root, 12)
  const diagrams = await service(root, { directory: { pageBytes: 700 } })
  const empty = await diagrams.directoryPage({ path: 'empty', limit: 100 }, context)
  expect(empty).toMatchObject({ complete: true, entries: [], nextCursor: null, parent: '' })
  let page = await diagrams.directoryPage({ path: '', limit: 100 }, context)
  const paths: string[] = []
  let visited = 0
  let excluded = 0
  const boundaries = new Set<string | null>()
  do {
    paths.push(...page.entries.map(entry => entry.path))
    visited += page.visited
    excluded += page.excluded
    boundaries.add(page.stoppedBy)
    expect(Buffer.byteLength(JSON.stringify({ success: true, data: page }))).toBeLessThanOrEqual(700)
    if (page.complete)
      break
    expect(page.nextCursor).toMatch(/^[a-f0-9]{64}$/)
    page = await next(diagrams, page)
  } while (true)
  expect(new Set(paths).size).toBe(13)
  expect(paths.length).toBe(13)
  expect(visited).toBe(1115) // Raw native records include both dot entries.
  expect(excluded).toBe(1102)
  expect(boundaries.has('bytes')).toBe(true)
}, 15000)

test('a huge directory reaches EOF without content reads or prefix rescans', async () => {
  const root = await fixture()
  await files(root, 10003)
  let reads = 0
  let contentReads = 0
  let opened = 0
  let closed = 0
  const diagrams = await service(root, { repositoryHooks: {
    afterDirectoryRead: async () => {
      reads++
    },
    afterReadOpen: async () => { contentReads++ },
    directoryStreamOpened: () => { opened++ },
    directoryStreamClosed: () => {
      closed++
    },
  } })
  let page = await diagrams.directoryPage({ path: '', limit: 200 }, context)
  const paths: string[] = []
  do {
    expect(page.entries.length).toBeLessThanOrEqual(200)
    expect(page.visited).toBeLessThanOrEqual(1024)
    paths.push(...page.entries.map(entry => entry.path))
    if (page.complete)
      break
    page = await next(diagrams, page)
  } while (true)
  expect(paths.length).toBe(10003)
  expect(new Set(paths).size).toBe(10003)
  expect(reads).toBe(10006) // Files, two dot records and the EOF read.
  expect(contentReads).toBe(0)
  expect([opened, closed]).toEqual([1, 1])
}, 60000)

test('actual metadata excludes symlinks, hard links, ignored names and invalid UTF-8', async () => {
  const root = await fixture()
  await files(root, 1)
  await mkdir(join(root, 'folder'))
  await mkdir(join(root, 'target'))
  await symlink('folder', join(root, 'alias'))
  await link(join(root, '0.md'), join(root, 'hard.md'))
  await writeFile(Buffer.concat([Buffer.from(`${root}/bad-`), Buffer.from([255]), Buffer.from('.md')]), '')
  await writeFile(join(root, 'valid-�.md'), '')
  await writeFile(join(root, 'unsupported.txt'), '')
  const diagrams = await service(root)
  const page = await diagrams.directoryPage({ path: '', limit: 100 }, context)
  expect(page.entries.map(entry => entry.path).sort()).toEqual(['folder', 'valid-�.md'])
  expect(page.excluded).toBe(8)
  for (const path of ['alias', 'target', '.hidden', 'folder/../folder', '/'])
    await expect(diagrams.directoryPage({ path, limit: 100 }, context)).rejects.toBeDefined()
})

test.each(['add', 'delete', 'rename', 'replace'] as const)('namespace %s between pages invalidates the owned continuation', async (change) => {
  const root = await fixture()
  await mkdir(join(root, 'folder'))
  await files(join(root, 'folder'))
  const diagrams = await service(root)
  const page = await diagrams.directoryPage({ path: 'folder', limit: 1 }, context)
  if (change === 'add')
    await writeFile(join(root, 'folder/new.md'), '')
  if (change === 'delete')
    await unlink(join(root, 'folder/0.md'))
  if (change === 'rename')
    await rename(join(root, 'folder'), join(root, 'renamed'))
  if (change === 'replace') {
    await rename(join(root, 'folder'), join(root, 'renamed'))
    await mkdir(join(root, 'folder'))
  }
  await expect(next(diagrams, page)).rejects.toMatchObject({ code: 'directory_changed' })
  await expect(next(diagrams, page)).rejects.toMatchObject({ code: 'cursor_stale' })
})

test('root validation wins over stale cursors and symlink ancestors are revalidated', async () => {
  const root = await fixture()
  await mkdir(join(root, 'folder'))
  await files(join(root, 'folder'))
  const diagrams = await service(root)
  const page = await diagrams.directoryPage({ path: 'folder', limit: 1 }, context)
  await rename(join(root, 'folder'), join(root, 'moved'))
  await symlink('moved', join(root, 'folder'))
  await expect(next(diagrams, page)).rejects.toMatchObject({ code: 'forbidden' })
  await rename(root, `${root}-moved`)
  roots.push(`${root}-moved`)
  await mkdir(root)
  await expect(next(diagrams, page)).rejects.toMatchObject({ code: 'unavailable' })
})

test('sibling changes preserve deep revisions and continuations; restarts change revisions', async () => {
  const root = await fixture()
  await mkdir(join(root, 'a'))
  await mkdir(join(root, 'b'))
  await files(join(root, 'a'))
  const diagrams = await service(root)
  const page = await diagrams.directoryPage({ path: 'a', limit: 1 }, context)
  await diagrams.createEntry({ kind: 'file', path: 'b/new.md' })
  expect((await diagrams.directoryRevision('a', context)).revision).toBe(page.revision)
  const second = await next(diagrams, page)
  expect(second.revision).toBe(page.revision)
  const restarted = await service(root)
  expect((await restarted.directoryRevision('a', context)).revision).not.toBe(page.revision)
  await expect(next(restarted, second)).rejects.toMatchObject({ code: 'cursor_stale' })
})

test('close, idle/absolute/session expiry and service shutdown release all real streams', async () => {
  const root = await fixture()
  await files(root)
  let now = Date.now()
  let handles = 0
  const diagrams = await service(root, { clock: () => now, repositoryHooks: { directoryStreamOpened: () => {
    handles++
  }, directoryStreamClosed: () => {
    handles--
  } } })
  const page = await diagrams.directoryPage({ path: '', limit: 1 }, context)
  expect(handles).toBe(1)
  await expect(diagrams.closeDirectory({ path: 'wrong', cursor: page.nextCursor! }, context)).rejects.toMatchObject({ code: 'invalid_request' })
  await diagrams.closeDirectory({ path: '', cursor: page.nextCursor! }, context)
  await diagrams.closeDirectory({ path: '', cursor: page.nextCursor! }, context)
  expect(handles).toBe(0)
  const idle = await diagrams.directoryPage({ path: '', limit: 1 }, context)
  now += 120000
  await expect(next(diagrams, idle)).rejects.toMatchObject({ code: 'cursor_stale' })
  const expiring = { ...context, principal: 'session', expiresAt: now + 1000 }
  const sessionPage = await diagrams.directoryPage({ path: '', limit: 1 }, expiring)
  expect(Date.parse(sessionPage.expiresAt!)).toBe(expiring.expiresAt)
  await diagrams.closePrincipal('session', context.origin)
  await diagrams.directoryPage({ path: '', limit: 1 }, context)
  await diagrams.close()
  expect(handles).toBe(0)
  await expect(diagrams.directoryRevision('', context)).rejects.toMatchObject({ code: 'unavailable' })
})

test('cancellation and deadlines keep reservations until the pending read and close settle', async () => {
  const root = await fixture()
  await files(root)
  const entered = gate()
  const resume = gate()
  let handles = 0
  let now = 1000
  const diagrams = await service(root, { clock: () => now, repositoryHooks: {
    afterDirectoryRead: async () => {
      entered.release()
      await resume.promise
    },
    directoryStreamOpened: () => {
      handles++
    },
    directoryStreamClosed: () => {
      handles--
    },
  } })
  const controller = new AbortController()
  const running = diagrams.directoryPage({ path: '', limit: 1 }, { ...context, signal: controller.signal })
  const result = running.catch(error => error)
  await entered.promise
  controller.abort()
  now += 5000
  let stopped = false
  const closing = diagrams.close().then(() => {
    stopped = true
  })
  expect(handles).toBe(1)
  expect(stopped).toBe(false)
  resume.release()
  expect((await result).code).toBe('unavailable')
  await closing
  expect(handles).toBe(0)
})

test('directory operation capacity rejects before consuming a valid cursor', async () => {
  const root = await fixture()
  await files(root)
  const entered = gate()
  const resume = gate()
  let blocked = false
  let count = 0
  const diagrams = await service(root, { repositoryHooks: { afterDirectoryRead: async () => {
    if (blocked) {
      if (++count === 4)
        entered.release()
      await resume.promise
    }
  } } })
  const page = await diagrams.directoryPage({ path: '', limit: 1 }, context)
  blocked = true
  const running = Array.from({ length: 4 }, () => diagrams.directoryPage({ path: '', limit: 1 }, context))
  await entered.promise
  await expect(next(diagrams, page)).rejects.toMatchObject({ code: 'rate_limited' })
  await expect(diagrams.directoryRevision('', context)).rejects.toMatchObject({ code: 'rate_limited' })
  blocked = false
  resume.release()
  await Promise.all(running)
  expect((await next(diagrams, page)).entries).toHaveLength(1)
})

test('local mutation invalidates active pages and failed temporary writes invalidate idle cursors', async () => {
  const root = await fixture()
  await files(root)
  const entered = gate()
  const resume = gate()
  let block = true
  const diagrams = await service(root, { repositoryHooks: { afterDirectoryRead: async () => {
    if (block) {
      entered.release()
      await resume.promise
    }
  } } })
  const pending = diagrams.directoryPage({ path: '', limit: 1 }, context).catch(error => error)
  await entered.promise
  await diagrams.createEntry({ kind: 'file', path: 'new.md' })
  block = false
  resume.release()
  expect((await pending).code).toBe('directory_changed')
  const page = await diagrams.directoryPage({ path: '', limit: 1 }, context)
  await expect(diagrams.createEntry({ kind: 'file', path: 'new.md' })).rejects.toMatchObject({ code: 'exists' })
  await expect(next(diagrams, page)).rejects.toMatchObject({ code: 'cursor_stale' })
})

test('depth 64 supports directory creation, document read/revision/save and all file mutations', async () => {
  const root = await fixture()
  const prefix = Array.from({ length: 63 }).fill('d').join('/')
  await mkdir(join(root, prefix), { recursive: true })
  const diagrams = await service(root)
  const folder = `${prefix}/folder`
  await diagrams.createEntry({ kind: 'directory', path: folder })
  expect(await diagrams.directoryPage({ path: folder, limit: 100 }, context)).toMatchObject({ complete: false, stoppedBy: 'depth', nextCursor: null, entries: [], visited: 0 })
  await diagrams.deleteEntry({ kind: 'directory', path: folder })
  const path = `${prefix}/file.mmd`
  await diagrams.createEntry({ kind: 'file', path })
  const document = await diagrams.readDocument(path)
  expect((await diagrams.documentRevision(path)).state).toBe('present')
  const saved = await diagrams.saveDiagram({ path, selector: { kind: 'standalone' }, expectedVersion: document.version, source: 'graph LR' })
  const moved = `${prefix}/moved.mmd`
  await diagrams.moveEntry({ kind: 'file', from: path, to: moved, expectedVersion: saved.version })
  await diagrams.deleteEntry({ kind: 'file', path: moved, expectedVersion: saved.version })
  for (const operation of [() => diagrams.readDocument(`${prefix}/more/file.mmd`), () => diagrams.createEntry({ kind: 'directory', path: `${prefix}/more/folder` }), () => diagrams.directoryPage({ path: `${prefix}/more/folder`, limit: 100 }, context)])
    await expect(operation()).rejects.toMatchObject({ code: 'forbidden' })
}, 15000)

test('growing-prefix moves audit projected depth before modifying either operand', async () => {
  const root = await fixture()
  await mkdir(join(root, 'a/b/c'), { recursive: true })
  await mkdir(join(root, 'destination'))
  await writeFile(join(root, 'a/b/c/file.md'), '')
  const diagrams = await service(root, {}, 4)
  await expect(diagrams.moveEntry({ kind: 'directory', from: 'a', to: 'destination/longer' })).rejects.toMatchObject({ code: 'forbidden' })
  expect(await readdir(join(root, 'destination'))).toEqual([])
  await writeFile(join(root, 'a/.hidden'), 'preserved')
  await diagrams.moveEntry({ kind: 'directory', from: 'a', to: 'longer' })
  expect(await Bun.file(join(root, 'longer/.hidden')).text()).toBe('preserved')
  await diagrams.moveEntry({ kind: 'directory', from: 'longer', to: 'a' })
  expect(await readdir(join(root, 'a/b/c'))).toEqual(['file.md'])
})

test('growing-prefix audit observes churn and refuses exhausted traversal before a placeholder', async () => {
  const root = await fixture()
  await mkdir(join(root, 'a'))
  const changed = await service(root, { repositoryHooks: { afterMoveAudit: async () => {
    await writeFile(join(root, 'a/new.md'), '')
  } } })
  await expect(changed.moveEntry({ kind: 'directory', from: 'a', to: 'longer' })).rejects.toMatchObject({ code: 'conflict' })
  expect((await readdir(root)).sort()).toEqual(['a'])
  await files(join(root, 'a'), 8193, '.')
  const diagrams = await service(root)
  await expect(diagrams.moveEntry({ kind: 'directory', from: 'a', to: 'longer' })).rejects.toMatchObject({ code: 'too_large' })
  expect((await readdir(root)).sort()).toEqual(['a'])
  await rm(join(root, 'a'), { recursive: true })
}, 15000)

test('excluded-only pages stop on visits and remain explicitly continuable', async () => {
  const root = await fixture()
  await files(root, 1100, '.')
  const diagrams = await service(root)
  const page = await diagrams.directoryPage({ path: '', limit: 100 }, context)
  expect(page).toMatchObject({ entries: [], visited: 1024, excluded: 1024, stoppedBy: 'visits', complete: false })
  expect(await next(diagrams, page)).toMatchObject({ entries: [], visited: 78, excluded: 78, complete: true, stoppedBy: null, nextCursor: null })
})

test('stream quotas bound per-session and global reservations and permit disposal at capacity', async () => {
  const root = await fixture()
  await files(root)
  let handles = 0
  const diagrams = await service(root, { repositoryHooks: { directoryStreamOpened: () => {
    handles++
  }, directoryStreamClosed: () => {
    handles--
  } } })
  const session = { ...context, principal: 'session', expiresAt: Date.now() + 60000 }
  for (let i = 0; i < 4; i++)
    await diagrams.directoryPage({ path: '', limit: 1 }, session)
  await expect(diagrams.directoryPage({ path: '', limit: 1 }, session)).rejects.toMatchObject({ code: 'rate_limited' })
  await diagrams.closePrincipal(session.principal, session.origin)
  expect(handles).toBe(0)
  const pages = []
  for (let i = 0; i < 32; i++)
    pages.push(await diagrams.directoryPage({ path: '', limit: 1 }, context))
  expect(handles).toBe(32)
  await expect(diagrams.directoryPage({ path: '', limit: 1 }, context)).rejects.toMatchObject({ code: 'rate_limited' })
  await diagrams.closeDirectory({ path: '', cursor: pages[0]!.nextCursor! }, context)
  expect(handles).toBe(31)
  await diagrams.directoryPage({ path: '', limit: 1 }, context)
  await diagrams.close()
  expect(handles).toBe(0)
})

test('absolute lifetime bounds refreshed pages and exact session expiry rejects continuation', async () => {
  const root = await fixture()
  await files(root, 40)
  let now = 0
  const diagrams = await service(root, { clock: () => now })
  let page = await diagrams.directoryPage({ path: '', limit: 1 }, context)
  for (let i = 0; i < 32; i++) {
    now += 110000
    page = await next(diagrams, page)
  }
  expect(Date.parse(page.expiresAt!)).toBe(3600000)
  now = 3600000
  await expect(next(diagrams, page)).rejects.toMatchObject({ code: 'cursor_stale' })
  const session = { ...context, principal: 'session', expiresAt: now + 100 }
  const last = await diagrams.directoryPage({ path: '', limit: 1 }, session)
  now += 100
  await expect(diagrams.directoryPage({ path: '', limit: 1, cursor: last.nextCursor! }, session)).rejects.toMatchObject({ code: 'unauthorized' })
})

test('logical deadline closes a stream only after the actual read settles', async () => {
  const root = await fixture()
  await files(root)
  let now = 0
  let closed = 0
  const diagrams = await service(root, { clock: () => now, repositoryHooks: { afterDirectoryRead: async () => {
    now = 5000
  }, directoryStreamClosed: () => {
    closed++
  } } })
  await expect(diagrams.directoryPage({ path: '', limit: 1 }, context)).rejects.toMatchObject({ code: 'unavailable' })
  expect(closed).toBe(1)
})

test('external churn during enumeration fails the whole page and releases its stream', async () => {
  const root = await fixture()
  await files(root)
  let changed = false
  let closed = 0
  const diagrams = await service(root, { repositoryHooks: {
    afterDirectoryRead: async () => {
      if (!changed) {
        changed = true
        await writeFile(join(root, 'new.md'), '')
      }
    },
    directoryStreamClosed: () => {
      closed++
    },
  } })
  await expect(diagrams.directoryPage({ path: '', limit: 1 }, context)).rejects.toMatchObject({ code: 'directory_changed' })
  expect(closed).toBe(1)
})

test('fresh revision performs no enumeration and fresh path errors preserve safe mappings', async () => {
  const root = await fixture()
  await files(root)
  let reads = 0
  const diagrams = await service(root, { repositoryHooks: { afterDirectoryRead: async () => {
    reads++
  } } })
  await diagrams.directoryRevision('', context)
  expect(reads).toBe(0)
  await expect(diagrams.directoryRevision('missing', context)).rejects.toMatchObject({ code: 'not_found' })
  await expect(diagrams.directoryRevision('0.md', context)).rejects.toMatchObject({ code: 'forbidden' })
  await expect(diagrams.directoryPage({ path: '', limit: 1, cursor: 'invalid' }, context)).rejects.toMatchObject({ code: 'invalid_request' })
})

test('new probes during a paused save fail while graceful shutdown still finishes that save', async () => {
  const root = await fixture()
  await writeFile(join(root, 'file.mmd'), 'graph TD')
  const entered = gate()
  const resume = gate()
  const diagrams = await service(root, { repositoryHooks: { afterTempWrite: async () => {
    entered.release()
    await resume.promise
  } } })
  const document = await diagrams.readDocument('file.mmd')
  const save = diagrams.saveDiagram({ path: 'file.mmd', selector: { kind: 'standalone' }, expectedVersion: document.version, source: 'graph LR' })
  await entered.promise
  await expect(diagrams.directoryRevision('', context)).rejects.toMatchObject({ code: 'directory_changed' })
  await expect(diagrams.directoryPage({ path: '', limit: 1 }, context)).rejects.toMatchObject({ code: 'directory_changed' })
  let stopped = false
  const closing = diagrams.close().then(() => {
    stopped = true
  })
  expect(stopped).toBe(false)
  resume.release()
  expect((await save).blocks[0]?.source).toBe('graph LR')
  await closing
  expect(await Bun.file(join(root, 'file.mmd')).text()).toBe('graph LR')
  await expect(diagrams.createEntry({ kind: 'file', path: 'later.mmd' })).rejects.toMatchObject({ code: 'unavailable' })
})

test('idle/session sweep closes actual descriptors without another request', async () => {
  const root = await fixture()
  await files(root)
  let now = Date.now()
  const released = gate()
  const diagrams = await service(root, { clock: () => now, repositoryHooks: { directoryStreamClosed: () => {
    released.release()
  } } })
  const ownedDescriptors = async () => {
    const paths = await Promise.all((await readdir('/proc/self/fd')).map(fd => readlink(`/proc/self/fd/${fd}`).catch(() => '')))
    return paths.filter(path => path === root || path.startsWith(`${root}/`)).length
  }
  expect(await ownedDescriptors()).toBe(0)
  await diagrams.directoryPage({ path: '', limit: 1 }, { ...context, principal: 'session', expiresAt: now + 100 })
  expect(await ownedDescriptors()).toBe(2)
  now += 100
  await released.promise
  expect(await ownedDescriptors()).toBe(0)
}, 7000)

test.each([0, 32])('byte-boundary pending entry and late request abort do not skip names (%i hidden entries)', async (hidden) => {
  const root = await fixture()
  await files(root, 8)
  await files(root, hidden, '.')
  const controller = new AbortController()
  const reads: string[] = []
  const diagrams = await service(root, { directory: { pageBytes: 700 }, repositoryHooks: {
    afterDirectoryRead: async (_path, name) => {
      if (name !== null)
        reads.push(name)
    },
  } })
  const first = await diagrams.directoryPage({ path: '', limit: 100 }, { ...context, signal: controller.signal })
  expect(first.stoppedBy).toBe('bytes')
  expect(Buffer.byteLength(JSON.stringify({ success: true, data: first }))).toBeLessThanOrEqual(700)
  expect(first.visited).toBe(reads.length)
  const accepted = reads.filter(name => /^[0-7]\.md$/.test(name))
  expect(first.excluded).toBe(reads.length - accepted.length)
  expect(first.entries.map(entry => entry.path)).toEqual(accepted.slice(0, -1))
  // Native dots/excluded names can occur anywhere; the last accepted record is pending.
  expect(first.visited).toBe(first.entries.length + first.excluded + 1)
  controller.abort()
  const paths = first.entries.map(entry => entry.path)
  let page = first
  let pending = accepted.at(-1)
  let visited = first.visited
  let excluded = first.excluded
  while (!page.complete) {
    const before = reads.length
    const pendingIn = pending === undefined ? 0 : 1
    page = await next(diagrams, page)
    expect(page.entries.length).toBeGreaterThan(0)
    if (pending !== undefined)
      expect(page.entries[0]!.path).toBe(pending)
    expect(page.visited).toBe(reads.length - before)
    const pendingOut = page.stoppedBy === 'bytes' ? 1 : 0
    expect(page.visited + pendingIn).toBe(page.entries.length + page.excluded + pendingOut)
    pending = pendingOut ? reads.slice(before).filter(name => /^[0-7]\.md$/.test(name)).at(-1) : undefined
    expect(Buffer.byteLength(JSON.stringify({ success: true, data: page }))).toBeLessThanOrEqual(700)
    paths.push(...page.entries.map(entry => entry.path))
    visited += page.visited
    excluded += page.excluded
  }
  expect(paths.sort()).toEqual(Array.from({ length: 8 }, (_, index) => `${index}.md`))
  expect(new Set(paths).size).toBe(paths.length)
  expect(visited).toBe(reads.length)
  expect(excluded).toBe(reads.filter(name => !/^[0-7]\.md$/.test(name)).length)
  expect(visited).toBe(paths.length + excluded)
  expect(page.nextCursor).toBeNull()
})

test('folder move audits projected path length and directory count with unchanged operands on refusal', async () => {
  const root = await fixture()
  const nested = `a/${'q'.repeat(240)}/${'w'.repeat(240)}/${'e'.repeat(240)}/${'r'.repeat(240)}`
  await mkdir(join(root, nested), { recursive: true })
  await writeFile(join(root, nested, 'x.md'), '')
  const diagrams = await service(root)
  await expect(diagrams.moveEntry({ kind: 'directory', from: 'a', to: 'long'.repeat(20) })).rejects.toMatchObject({ code: 'forbidden' })
  expect(await readdir(root)).toEqual(['a'])
  await mkdir(join(root, 'many'))
  for (let i = 0; i < 1025; i++)
    await mkdir(join(root, `many/d${i}`))
  await expect(diagrams.moveEntry({ kind: 'directory', from: 'many', to: 'longer' })).rejects.toMatchObject({ code: 'too_large' })
  expect((await readdir(root)).sort()).toEqual(['a', 'many'])
}, 15000)

test('configured path limit applies coherently to every mutation operand', async () => {
  const root = await fixture()
  await mkdir(join(root, 'a/b/c'), { recursive: true })
  await writeFile(join(root, 'a/b/c/file.md'), '')
  const diagrams = await service(root, {}, 4)
  const version = (await diagrams.readDocument('a/b/c/file.md')).version
  const deep = 'a/b/c/d/file.md'
  const operations = [
    () => diagrams.saveDiagram({ path: deep, selector: { kind: 'standalone' as const }, expectedVersion: version, source: '' }),
    () => diagrams.moveEntry({ kind: 'file' as const, from: 'a/b/c/file.md', to: deep, expectedVersion: version }),
    () => diagrams.moveEntry({ kind: 'file' as const, from: deep, to: 'file.md', expectedVersion: version }),
    () => diagrams.deleteEntry({ kind: 'file' as const, path: deep, expectedVersion: version }),
    () => diagrams.moveEntry({ kind: 'directory' as const, from: 'a', to: 'b/c/d/e/f' }),
    () => diagrams.moveEntry({ kind: 'directory' as const, from: 'b/c/d/e/f', to: 'z' }),
    () => diagrams.deleteEntry({ kind: 'directory' as const, path: 'b/c/d/e/f' }),
  ]
  for (const operation of operations)
    await expect(operation()).rejects.toMatchObject({ code: 'forbidden' })
  await diagrams.createEntry({ kind: 'directory', path: 'a/b/c/d' })
  await diagrams.moveEntry({ kind: 'directory', from: 'a/b/c/d', to: 'a/b/c/e' })
  await diagrams.directoryRevision('a/b/c/e', context)
  await diagrams.deleteEntry({ kind: 'directory', path: 'a/b/c/e' })
})

test('permission failure is not misreported as an empty directory', async () => {
  const root = await fixture()
  await mkdir(join(root, 'private'))
  const diagrams = await service(root)
  await chmod(join(root, 'private'), 0)
  try {
    await expect(diagrams.directoryPage({ path: 'private', limit: 100 }, context)).rejects.toMatchObject({ code: 'forbidden' })
  }
  finally { await chmod(join(root, 'private'), 0o700) }
})

test('search finds diagrams in every subfolder below the chosen folder, by name or by folder', async () => {
  const root = await fixture()
  await mkdir(join(root, 'nsiod/mermaid/mesh-v1/deep'), { recursive: true })
  await mkdir(join(root, 'nsiod/other'), { recursive: true })
  await mkdir(join(root, 'nsiod/mermaid/node_modules'), { recursive: true })
  await mkdir(join(root, 'nsiod/mermaid/target'), { recursive: true })
  await mkdir(join(root, 'nsiod/mermaid/.hidden'), { recursive: true })
  await writeFile(join(root, 'nsiod/mermaid/mesh-v1/03-relay-state.mmd'), 'graph TD')
  await writeFile(join(root, 'nsiod/mermaid/mesh-v1/deep/13-relay-gantt.mmd'), 'gantt')
  await writeFile(join(root, 'nsiod/mermaid/mesh-v1/notes.txt'), 'relay')
  await writeFile(join(root, 'nsiod/mermaid/node_modules/relay.mmd'), 'graph TD')
  await writeFile(join(root, 'nsiod/mermaid/target/relay.mmd'), 'graph TD')
  await writeFile(join(root, 'nsiod/mermaid/.hidden/relay.mmd'), 'graph TD')
  await writeFile(join(root, 'nsiod/other/relay.mmd'), 'graph TD')
  const diagrams = await service(root)

  const found = await diagrams.searchDirectory({ path: 'nsiod/mermaid', query: 'RELAY' }, context)
  expect(found.complete).toBe(true)
  expect(found.stoppedBy).toBeNull()
  // Hidden and generated folders stay excluded, unsupported files are not listed and nothing outside the folder is found.
  expect(found.entries.map(entry => entry.path).sort()).toEqual(['nsiod/mermaid/mesh-v1/03-relay-state.mmd', 'nsiod/mermaid/mesh-v1/deep/13-relay-gantt.mmd'])
  expect(found.entries.every(entry => entry.kind === 'file' && entry.state === 'deferred')).toBe(true)

  // A folder name matches too, so its contents are reachable from the name the reader remembers.
  const byFolder = await diagrams.searchDirectory({ path: 'nsiod', query: 'mesh-v1' }, context)
  expect(byFolder.entries.map(entry => entry.path)).toContain('nsiod/mermaid/mesh-v1')
  expect(byFolder.entries.map(entry => entry.path)).toContain('nsiod/mermaid/mesh-v1/deep/13-relay-gantt.mmd')

  const fromRoot = await diagrams.searchDirectory({ path: '', query: 'relay' }, context)
  expect(fromRoot.entries.map(entry => entry.path).sort()).toEqual(['nsiod/mermaid/mesh-v1/03-relay-state.mmd', 'nsiod/mermaid/mesh-v1/deep/13-relay-gantt.mmd', 'nsiod/other/relay.mmd'])
})

test('search by file kind lists only that kind below the folder, with or without text', async () => {
  const root = await fixture()
  await mkdir(join(root, 'nsiod/mermaid/mesh-v1/deep'), { recursive: true })
  await mkdir(join(root, 'nsiod/mermaid/.hidden'), { recursive: true })
  await mkdir(join(root, 'nsiod/relay-notes'), { recursive: true })
  await writeFile(join(root, 'nsiod/mermaid/mesh-v1/03-relay-state.mmd'), 'graph TD')
  await writeFile(join(root, 'nsiod/mermaid/mesh-v1/deep/13-relay-gantt.mermaid'), 'gantt')
  await writeFile(join(root, 'nsiod/mermaid/mesh-v1/deep/relay.md'), '# Relay')
  await writeFile(join(root, 'nsiod/mermaid/mesh-v1/deep/report.html'), '<h1>Report</h1>')
  await writeFile(join(root, 'nsiod/page.htm'), '<p>Page</p>')
  await writeFile(join(root, 'nsiod/mermaid/.hidden/hidden.md'), '# Hidden')
  await writeFile(join(root, 'nsiod/relay-notes/relay.txt'), 'relay')
  await writeFile(join(root, 'nsiod/overview.md'), '# Overview')
  const diagrams = await service(root)

  // Without text a kind lists every visible file of that kind below the folder, and no folder.
  const markdown = await diagrams.searchDirectory({ path: 'nsiod', query: '', kind: 'markdown' }, context)
  expect(markdown).toMatchObject({ path: 'nsiod', query: '', kind: 'markdown', complete: true, stoppedBy: null })
  expect(markdown.entries.map(entry => entry.path).sort()).toEqual(['nsiod/mermaid/mesh-v1/deep/relay.md', 'nsiod/overview.md'])
  const mermaid = await diagrams.searchDirectory({ path: 'nsiod', query: '', kind: 'mermaid' }, context)
  expect(mermaid.entries.map(entry => entry.path).sort()).toEqual(['nsiod/mermaid/mesh-v1/03-relay-state.mmd', 'nsiod/mermaid/mesh-v1/deep/13-relay-gantt.mermaid'])
  const html = await diagrams.searchDirectory({ path: 'nsiod', query: '', kind: 'html' }, context)
  expect(html.entries.map(entry => entry.path).sort()).toEqual(['nsiod/mermaid/mesh-v1/deep/report.html', 'nsiod/page.htm'])

  // With text, files must have the kind and match the text, while folders still match by text alone.
  const both = await diagrams.searchDirectory({ path: 'nsiod', query: 'relay', kind: 'markdown' }, context)
  expect(both.entries.map(entry => entry.path).sort()).toEqual(['nsiod/mermaid/mesh-v1/deep/relay.md', 'nsiod/relay-notes'])
  expect((await diagrams.searchDirectory({ path: 'nsiod', query: 'relay' }, context)).kind).toBeNull()
})

test('search stops at its match budget and reports a partial result', async () => {
  const root = await fixture()
  await mkdir(join(root, 'many'))
  for (let i = 0; i < 205; i++)
    await writeFile(join(root, `many/diagram-${i}.mmd`), 'graph TD')
  await writeFile(join(root, 'many/diagram-notes.md'), '# Notes')
  const diagrams = await service(root)
  const found = await diagrams.searchDirectory({ path: '', query: 'diagram' }, context)
  expect(found.entries).toHaveLength(200)
  expect(found.stoppedBy).toBe('matches')
  expect(found.complete).toBe(false)
  // The kind applies before the budget, so files of another kind never crowd out the chosen one.
  const typed = await diagrams.searchDirectory({ path: '', query: 'diagram', kind: 'markdown' }, context)
  expect(typed.entries.map(entry => entry.path)).toEqual(['many/diagram-notes.md'])
  expect(typed.complete).toBe(true)
})

test('search refuses malformed queries and paths before reading the project', async () => {
  const root = await fixture()
  const diagrams = await service(root)
  for (const request of [{ path: '', query: '' }, { path: '', query: '   ' }, { path: '', query: 'x'.repeat(201) }, { path: '', query: 'a\u0007b' }, { path: '../escape', query: 'a' }, { path: 'a/../b', query: 'a' }])
    await expect(diagrams.searchDirectory(request, context)).rejects.toMatchObject({ code: expect.stringMatching(/invalid_request|forbidden/) })
  await expect(diagrams.searchDirectory({ path: 'missing', query: 'a' }, context)).rejects.toMatchObject({ code: expect.stringMatching(/not_found|deleted/) })
})
