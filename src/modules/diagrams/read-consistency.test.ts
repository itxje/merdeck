import type { FileHandle } from 'node:fs/promises'
import type { RepositoryHooks } from './repository'
import { link, mkdir, readdir, readFile, readlink, rename, stat, symlink, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { createFixture, fixtureLimits, removeFixture } from '../../../tests/integration/files/fixtures'
import { AppError } from '../../shared/errors'
import { createDiagramService } from './service'
import '../../../tests/integration/api/read-consistency.test'

async function withFixture(run: (root: string) => Promise<void>) {
  const root = await createFixture('files-read-consistency-')
  try {
    await writeFile(join(root, 'flow.mmd'), 'graph TD\nInitial-->Value\n')
    await run(root)
  }
  finally {
    const held = await Promise.all((await readdir('/proc/self/fd')).map(async (fd) => {
      const path = await readlink(`/proc/self/fd/${fd}`).catch(() => '')
      return path === root || path.startsWith(`${root}/`) ? path : undefined
    }))
    expect(held.filter(Boolean)).toEqual([])
    await removeFixture(root)
  }
}

async function expectClosed(handles: FileHandle[]) {
  for (const handle of handles)
    await expect(handle.stat()).rejects.toMatchObject({ code: 'EBADF' })
}

for (const mode of ['in-place', 'atomic'] as const) {
  test(`read reopens after an independent ${mode} edit and closes every attempt`, () => withFixture(async (root) => {
    const path = join(root, 'flow.mmd')
    const handles: FileHandle[] = []
    const source = 'graph TD\nCurrent-->Value\n'
    let changes = 0
    const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits }, { repositoryHooks: {
      afterReadOpen: async (_, handle) => {
        await expectClosed(handles)
        handles.push(handle)
      },
      afterFileOpen: async () => {
        if (changes++)
          return
        const child = Bun.spawn([process.execPath, '-e', 'import {writeFile,rename} from "node:fs/promises"; const [p,mode,source]=process.argv.slice(1); const target=mode==="atomic"?p+".new":p; await writeFile(target,source); if(mode==="atomic") await rename(target,p)', path, mode, source], { stdout: 'ignore', stderr: 'pipe', timeout: 3000 })
        expect(await child.exited).toBe(0)
      },
    } })
    const document = await service.readDocument('flow.mmd')
    expect(document.blocks[0]?.source).toBe(source)
    expect(document.version).toBe(new Bun.CryptoHasher('sha256').update(source).digest('hex'))
    expect(handles).toHaveLength(2)
    await expectClosed(handles)
    expect(await readdir(root)).toEqual(['flow.mmd'])
  }))
}

test('continued read churn stops after exactly three complete attempts with conflict', () => withFixture(async (root) => {
  const handles: FileHandle[] = []
  let changes = 0
  const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits }, { repositoryHooks: {
    afterReadOpen: async (_, handle) => { handles.push(handle) },
    afterFileOpen: async () => { await writeFile(join(root, 'flow.mmd'), `graph TD\nA-->Version${++changes}\n`) },
  } })
  await expect(service.readDocument('flow.mmd')).rejects.toMatchObject({ code: 'conflict' })
  expect(changes).toBe(3)
  expect(handles).toHaveLength(3)
  await expectClosed(handles)
  expect(await readdir(root)).toEqual(['flow.mmd'])
}))

test.each(['forbidden', 'conflict', 'unavailable'] as const)('ordinary %s errors are not read-retry signals', code => withFixture(async (root) => {
  const handles: FileHandle[] = []
  const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits }, { repositoryHooks: { afterReadOpen: async (_, handle) => {
    handles.push(handle)
    throw new AppError(code)
  } } })
  await expect(service.readDocument('flow.mmd')).rejects.toMatchObject({ code })
  expect(handles).toHaveLength(1)
  await expectClosed(handles)
}))

test('deletion of a held descriptor returns deleted without recreating a target', () => withFixture(async (root) => {
  const handles: FileHandle[] = []
  const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits }, { repositoryHooks: { afterReadOpen: async (_, handle) => {
    handles.push(handle)
    await unlink(join(root, 'flow.mmd'))
    expect((await handle.stat()).nlink).toBe(0)
  } } })
  expect(await service.documentRevision('flow.mmd')).toEqual({ path: 'flow.mmd', state: 'deleted' })
  await expect(service.readDocument('flow.mmd')).rejects.toMatchObject({ code: 'deleted' })
  await expectClosed(handles)
  expect(await readdir(root)).toEqual([])
}))

for (const replacement of ['hardlink', 'symlink', 'directory', 'oversized', 'permission', 'root', 'ancestor'] as const) {
  test(`a ${replacement} at the retry boundary is refused with no unchecked bytes`, () => withFixture(async (fixture) => {
    const root = join(fixture, 'project')
    const nested = join(root, 'nested')
    await mkdir(nested, { recursive: true })
    const path = join(nested, 'flow.mmd')
    const outside = join(fixture, 'outside.mmd')
    await writeFile(path, 'graph TD\nInside-->Value\n')
    await writeFile(outside, 'private sentinel')
    const handles: FileHandle[] = []
    let attempts = 0
    let accepted = 0
    const hooks: RepositoryHooks = {
      afterReadOpen: async (_, handle) => {
        handles.push(handle)
        if (++attempts !== 1) {
          if (replacement === 'permission')
            throw Object.assign(new Error('Test-only permission denial'), { code: 'EACCES' })
          return
        }
        await unlink(path)
        if (replacement === 'hardlink') {
          await link(outside, path)
        }
        else if (replacement === 'symlink') {
          await symlink(outside, path)
        }
        else if (replacement === 'directory') {
          await mkdir(path)
        }
        else if (replacement === 'oversized') {
          await writeFile(path, 'x'.repeat(fixtureLimits.maxFileBytes + 1))
        }
        else if (replacement === 'root') {
          await rename(root, join(fixture, 'moved'))
          await mkdir(root)
        }
        else if (replacement === 'ancestor') {
          await rename(nested, join(root, 'moved'))
          await symlink(fixture, nested)
        }
        else {
          await writeFile(path, 'new target')
        }
        expect((await handle.stat()).nlink).toBe(0)
      },
      afterFileOpen: async () => { accepted++ },
    }
    const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits }, { repositoryHooks: hooks })
    const code = replacement === 'root' ? 'unavailable' : replacement === 'oversized' ? 'too_large' : replacement === 'directory' ? 'unsupported' : 'forbidden'
    await expect(service.readDocument('nested/flow.mmd')).rejects.toMatchObject({ code })
    expect(accepted).toBe(0)
    expect(attempts).toBeLessThanOrEqual(2)
    await expectClosed(handles)
    expect(await readFile(outside, 'utf8')).toBe('private sentinel')
  }))
}

test('read-only hooks and reopening never run for either write-side comparison', () => withFixture(async (root) => {
  let changes = false
  let readOpens = 0
  let comparisons = 0
  const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits }, { repositoryHooks: {
    afterReadOpen: async () => { readOpens++ },
    afterFileOpen: async () => {
      if (changes) {
        comparisons++
        await writeFile(join(root, 'flow.mmd'), `graph TD\nExternal-->${comparisons}\n`)
      }
    },
  } })
  const document = await service.readDocument('flow.mmd')
  readOpens = 0
  const saved = await service.saveDiagram({ path: document.path, selector: document.blocks[0]!.selector, expectedVersion: document.version, source: 'graph TD\nSaved-->Value\n' })
  expect(readOpens).toBe(0)
  changes = true
  await expect(service.saveDiagram({ path: saved.path, selector: saved.blocks[0]!.selector, expectedVersion: saved.version, source: 'graph TD\nDraft-->Value\n' })).rejects.toMatchObject({ code: 'conflict' })
  expect(readOpens).toBe(0)
  expect(comparisons).toBe(1)
  expect(await readFile(join(root, 'flow.mmd'), 'utf8')).toBe('graph TD\nExternal-->1\n')
  expect(await readdir(root)).toEqual(['flow.mmd'])
  expect((await stat(join(root, 'flow.mmd'))).nlink).toBe(1)
}))
