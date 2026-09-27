import type { BaselineModule, Evidence, Hooks } from './support'
import assert from 'node:assert/strict'
import { chmod, lstat, mkdir, readdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { actor, startActor } from './process'
import { config, errorCode, external, hash, original, proposed, schedule, snapshot } from './support'

export interface Fixture {
  base: string
  root: string
  target: string
  path: string
}
export type Run = (id: string, action: (fixture: Fixture) => Promise<Evidence>) => Promise<void>

async function save(module: BaselineModule, f: Fixture, hooks: Hooks = {}) {
  const service = await module.createDiagramService(config(f.root), { repositoryHooks: hooks })
  const document = await service.readDocument(f.path)
  return { service, request: { path: f.path, selector: document.blocks[0]!.selector, expectedVersion: document.version, source: proposed } }
}
async function outcome(action: () => Promise<unknown>) {
  try {
    const value = await action()
    return { succeeded: true, error: null, value }
  }
  catch (error) {
    return { succeeded: false, error: errorCode(error), value: error && typeof error === 'object' && 'currentVersion' in error ? error.currentVersion : null }
  }
}

export async function baselineScenarios(module: BaselineModule, readProbe: BaselineModule, run: Run): Promise<void> {
  for (const operation of ['observe', 'write', 'replace', 'delete', 'hold']) {
    const id = `publication-${operation}`
    await run(id, async (f) => {
      const { service, request } = await save(module, f)
      const before = await snapshot(f.target)
      const holder = operation === 'hold' ? startActor(f.base, 'hold', f.target) : undefined
      if (holder)
        await holder.ready
      let mutation: unknown = null
      let publicationCount = 0
      let visibleBefore: unknown = null
      let visibleAfter: unknown = null
      schedule.hit = async (point) => {
        if (point === 'publish') {
          publicationCount++
          mutation = operation === 'hold' ? null : await actor(f.base, operation, f.target)
          visibleBefore = await snapshot(f.target)
        }
        if (point === 'published') {
          if (holder) {
            holder.release()
            mutation = await holder.done.catch((error: unknown) => {
              mutation = String(error)
              throw error
            })
          }
          visibleAfter = (await actor(f.base, 'observe', f.target)).after
        }
      }
      const result = await outcome(() => service.saveDiagram(request))
      const after = await snapshot(f.target)
      const entries = await readdir(join(f.root, 'docs'))
      assert.equal(publicationCount, 1)
      assert.equal(result.succeeded, true, JSON.stringify({ id, result, mutation }))
      assert.equal(after.hash, hash(proposed))
      assert.deepEqual(entries, ['diagram.mmd'])
      if (operation === 'write' || operation === 'replace') {
        const event = mutation as Awaited<ReturnType<typeof actor>>
        assert.equal(event.after.hash, hash(external))
        assert.equal(event.before.ino === event.after.ino, operation === 'write')
      }
      if (operation === 'delete')
        assert.equal((mutation as Awaited<ReturnType<typeof actor>>).after.exists, false)
      if (operation === 'hold') {
        const event = mutation as Awaited<ReturnType<typeof actor>>
        assert.equal(event.descriptor?.openedIno, before.ino)
        if (event.descriptor?.writeError === null)
          assert.equal(event.descriptor.nlink, '0')
        else
          assert.equal(event.descriptor?.writeError, 'ENOENT')
      }
      const detachedWriteLostOnClose = operation === 'hold' && (mutation as Awaited<ReturnType<typeof actor>>).descriptor?.writeError === null
      return { id, classification: operation === 'observe' ? 'control-assertion' : operation === 'hold' ? 'capability-observation' : 'loss-diagnostic', schedule: 'After every final check; before original rename. Held descriptor writes after publication.', before, mutation, visibleBefore, visibleAfter, after, result, publicationCount, externalChangeOverwritten: operation === 'write' || operation === 'replace', deletionResurrected: operation === 'delete', detachedWriteLostOnClose, recoverableApplicationHashes: [after.hash], applicationEntries: entries }
    })
  }
  for (const operation of ['write', 'delete']) {
    const id = `earlier-${operation}-control`
    await run(id, async (f) => {
      const hooks = { afterTempWrite: async () => {
        await actor(f.base, operation, f.target)
      } }
      const { service, request } = await save(module, f, hooks)
      const result = await outcome(() => service.saveDiagram(request))
      const after = await snapshot(f.target)
      assert.equal(result.error, operation === 'write' ? 'conflict' : 'deleted')
      assert.equal(after.hash, operation === 'write' ? hash(external) : null)
      if (operation === 'write')
        assert.equal(result.value, hash(external))
      assert.deepEqual(await readdir(join(f.root, 'docs')), operation === 'write' ? ['diagram.mmd'] : [])
      return { id, classification: 'control-assertion', result, after, retainedExternal: operation === 'write', deletedRemainsAbsent: operation === 'delete' }
    })
  }
  await run('markdown-control', async (f) => {
    const path = 'docs/document.md'
    const target = join(f.root, path)
    const before = '\uFEFFTitle π\r\n~~~mermaid\r\ngraph TD\r\n~~~\r\nUntouched\n```mermaid\nsecond\n```'
    await writeFile(target, before)
    const { service, request } = await save(module, { ...f, target, path })
    const result = await service.saveDiagram(request)
    const expected = before.replace('graph TD\r\n', proposed.replaceAll('\n', '\r\n'))
    assert.equal(await readFile(target, 'utf8'), expected)
    assert.equal(result.version, hash(expected))
    return { id: 'markdown-control', classification: 'control-assertion', beforeHash: hash(before), afterHash: result.version, unaffectedBytesPreserved: true, scope: 'Simple BOM/CRLF/multi-block fixture only; not general parser acceptance' }
  })
  await containmentScenarios(readProbe, run)
}

async function containmentScenarios(module: BaselineModule, run: Run): Promise<void> {
  for (const mode of ['before-directory-validation', 'after-read-validation', 'publish-directory', 'publish-root']) {
    const id = `move-${mode}`
    await run(id, async (f) => {
      const moved = join(f.base, 'moved')
      const rootMove = mode === 'publish-root'
      const moving = rootMove ? f.root : join(f.root, 'docs')
      let movedOnce = false
      let readAfterMove = false
      let mutation: unknown = null
      const move = async () => {
        assert(!movedOnce)
        mutation = await actor(f.base, 'move', moving, moved)
        movedOnce = true
      }
      const service = await module.createDiagramService(config(f.root))
      const document = await service.readDocument(f.path)
      let result
      if (mode === 'before-directory-validation') {
        const early = await module.createDiagramService(config(f.root), { repositoryHooks: { afterDirectoryOpen: move } })
        result = await outcome(() => early.readDocument(f.path))
      }
      else {
        schedule.hit = async (point) => {
          if (point === (mode === 'after-read-validation' ? 'read' : 'publish') && !movedOnce)
            await move()
          if (point === 'read-complete' && movedOnce)
            readAfterMove = true
        }
        result = mode === 'after-read-validation'
          ? await outcome(() => service.readDocument(f.path))
          : await outcome(() => service.saveDiagram({ path: f.path, expectedVersion: document.version, selector: document.blocks[0]!.selector, source: proposed }))
      }
      const retained = await snapshot(join(moved, rootMove ? f.path : 'diagram.mmd'))
      assert(movedOnce)
      assert.equal((await snapshot(f.target)).exists, false)
      assert.equal(result.succeeded, mode.startsWith('publish'))
      if (!mode.startsWith('publish'))
        assert.equal(result.error, 'forbidden')
      assert.equal(retained.hash, hash(mode.startsWith('publish') ? proposed : original))
      assert.equal(readAfterMove, mode === 'after-read-validation')
      return { id, classification: mode === 'before-directory-validation' ? 'control-assertion' : 'containment-diagnostic', mutation, result, retained, readAfterMove, writeOutsideConfiguredPath: mode.startsWith('publish'), differentDirectoryRedirected: false, actorCapability: 'Independent same-uid process moved a directory; not an HTTP capability or a different-uid test' }
    })
  }
  await run('path-and-symlink-controls', async (f) => {
    const sibling = join(f.base, 'sibling')
    await mkdir(sibling)
    const secret = join(sibling, 'secret.mmd')
    await writeFile(secret, external)
    await symlink(secret, join(f.root, 'target.mmd'))
    await symlink(sibling, join(f.root, 'linked'))
    const service = await module.createDiagramService(config(f.root))
    const results = []
    let actualReads = 0
    schedule.hit = async (point) => {
      if (point === 'read-complete')
        actualReads++
    }
    for (const path of ['../sibling/secret.mmd', '/absolute.mmd', '%2e%2e/secret.mmd', 'docs/../../secret.mmd', 'target.mmd', 'linked/secret.mmd']) {
      const read = await outcome(() => service.readDocument(path))
      const write = await outcome(() => service.saveDiagram({ path, selector: { kind: 'standalone' }, expectedVersion: hash(external), source: proposed }))
      assert(['forbidden', 'invalid_request'].includes(read.error ?? ''))
      assert(['forbidden', 'invalid_request'].includes(write.error ?? ''))
      results.push({ path, read, write })
    }
    assert.equal(actualReads, 0)
    assert.equal(await readFile(secret, 'utf8'), external)
    return { id: 'path-and-symlink-controls', classification: 'control-assertion', results, actualReads, siblingUnchanged: true, transportScope: 'Service/schema inputs only; HTTP transport not implemented in this foundation' }
  })
  await run('native-mode-capability', async (f) => {
    const directory = join(f.root, 'docs')
    await chmod(directory, 0o500)
    const observedMode = (await lstat(directory)).mode & 0o777
    assert.equal(observedMode, 0o500)
    let result
    try {
      result = await actor(f.base, 'probe-create', join(directory, 'new.mmd'))
    }
    finally { await chmod(directory, 0o700) }
    const mode = (await lstat(directory)).mode & 0o777
    const injected = await module.createDiagramService(config(f.root), { repositoryHooks: { afterFileOpen: async () => {
      throw Object.assign(new Error('Injected permission failure'), { code: 'EACCES' })
    } } })
    const denial = await outcome(() => injected.readDocument(f.path))
    assert.equal(denial.error, 'forbidden')
    return { id: 'native-mode-capability', classification: 'capability-observation', attemptedDirectoryMode: '0500', observedMode, restoredMode: mode, uid: process.getuid?.(), independentCreateSucceeded: result.operationError === null, nativeResult: result, injectedPermissionResult: denial, effectiveIsolationVerified: false }
  })
}
