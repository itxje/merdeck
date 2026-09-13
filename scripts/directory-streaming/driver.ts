import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readdir, readlink } from 'node:fs/promises'
import { join } from 'node:path'
import { createDiagramService } from '../../src/modules/diagrams/service'
import { fixtureLimits } from '../../tests/integration/files/fixtures'

// This executable exercises the production repository/pager, with no alternate enumeration primitive.
const [root, action] = process.argv.slice(2)
assert(root && ['first', 'traverse', 'fault', 'cancel', 'audit'].includes(action ?? ''))
const context = { origin: 'http://localhost:8787', principal: 'open', expiresAt: null }
async function descriptors(path: string) {
  const links = await Promise.all((await readdir('/proc/self/fd')).map(async (fd) => {
    try {
      return await readlink(`/proc/self/fd/${fd}`)
    }
    catch { return '' }
  }))
  return links.filter(link => link === path).length
}
const abort = new AbortController()
let reads = 0
const service = await createDiagramService({ projectRoot: root, limits: { ...fixtureLimits, maxTreeEntries: 1, maxTreeDepth: 1 } }, { repositoryHooks: {
  beforeDirectoryRead() {
    reads++
    if (action === 'cancel' && reads === 1)
      setImmediate(() => abort.abort())
  },
} })
try {
  if (action === 'audit') {
    await assert.rejects(service.moveEntry({ kind: 'directory', from: 'huge', to: 'longer-huge' }), { code: 'too_large' })
    assert(reads > 0 && reads <= 8192)
    assert.equal(await descriptors(join(root, 'huge')), 0)
    process.stdout.write(`${JSON.stringify({ action, status: 'passed', reads })}\n`)
  }
  else if (action === 'fault' || action === 'cancel') {
    const started = performance.now()
    await assert.rejects(service.directoryPage({ path: 'small', limit: 1 }, { ...context, signal: abort.signal }), { code: 'unavailable' })
    assert.equal(await descriptors(join(root, 'small')), 0)
    if (action === 'cancel') {
      assert(abort.signal.aborted)
      assert.equal(reads, 1)
      assert(performance.now() - started >= 100, 'Injected synchronous call must actually delay completion')
    }
    process.stdout.write(`${JSON.stringify({ action, status: 'passed', elapsedMs: performance.now() - started })}\n`)
  }
  else {
    for (const [path, count] of [['small', 1003], ['huge', 32771], ['excluded', 10003]] as const) {
      if (action === 'first' && path === 'excluded')
        continue
      let page = await service.directoryPage({ path, limit: action === 'first' ? 1 : 200 }, context)
      const seen = new Set<string>()
      let visited = 0
      let excluded = 0
      let pages = 0
      do {
        pages++
        visited += page.visited
        excluded += page.excluded
        assert(page.visited <= 1024)
        assert(page.entries.length <= 200)
        assert(Buffer.byteLength(JSON.stringify({ success: true, data: page })) <= 262144)
        for (const entry of page.entries) {
          assert(!seen.has(entry.path))
          seen.add(entry.path)
          assert(entry.kind === 'file' && entry.state === 'deferred')
        }
        if (action === 'first') {
          assert.equal(page.entries.length, 1)
          assert.equal(page.complete, false)
          assert.equal(await descriptors(join(root, path)), 2, 'anchor and native stream must both remain owned')
          await service.closeDirectory({ path, cursor: page.nextCursor! }, context)
          assert.equal(await descriptors(join(root, path)), 0)
          break
        }
        if (page.complete)
          break
        const cursor = page.nextCursor!
        page = await service.directoryPage({ path, limit: 200, cursor }, context)
        await assert.rejects(service.directoryPage({ path, limit: 200, cursor }, context), { code: 'cursor_stale' })
      } while (true)
      if (action === 'traverse') {
        assert.equal(visited, count + 2)
        assert.equal(excluded, path === 'excluded' ? count + 2 : 2)
        assert.equal(seen.size, path === 'excluded' ? 0 : count)
        assert.equal(await descriptors(join(root, path)), 0)
      }
      process.stdout.write(`${JSON.stringify({ action, path, pages, visited, excluded, entries: seen.size, complete: page.complete, bun: Bun.version, architecture: process.arch, standalone: Bun.isStandaloneExecutable })}\n`)
    }
  }
}
finally { await service.close() }
