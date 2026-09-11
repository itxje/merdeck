import type { FileConfig } from '../../../src/modules/diagrams'
import { createHash } from 'node:crypto'
import * as filesystem from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { mock } from 'bun:test'

// Run only as an isolated diagnostic process: this deliberately intercepts the final rename.
// An observed overwrite is evidence of an OPEN risk, never a passing no-lost-update assertion.
async function reproduce() {
  await filesystem.mkdir(resolve('tmp'), { recursive: true })
  const fixture = await filesystem.mkdtemp(resolve('tmp/files-external-window-'))
  const path = join(fixture, 'diagram.mmd')
  const initial = 'graph TD\nInitial-->Version\n'
  const external = 'graph TD\nExternal-->Saved\n'
  const submitted = 'graph TD\nSubmitted-->Draft\n'
  const hash = (source: string) => createHash('sha256').update(source).digest('hex')
  const realRename = filesystem.rename
  let interceptionCount = 0
  let versionAtRename = ''
  let externalVersion = ''
  try {
    await filesystem.writeFile(path, initial)
    mock.module('node:fs/promises', () => ({
      ...filesystem,
      rename: async (...args: Parameters<typeof realRename>) => {
        interceptionCount++
        versionAtRename = hash(await filesystem.readFile(path, 'utf8'))
        // This independent process ignores the in-process save lock and performs real, synced I/O.
        const child = Bun.spawn([
          process.execPath,
          '-e',
          'import { open } from "node:fs/promises"; const handle = await open(process.argv[1], "w"); try { await handle.writeFile(process.argv[2]); await handle.sync(); } finally { await handle.close(); }',
          path,
          external,
        ], { stdout: 'pipe', stderr: 'pipe' })
        if (await child.exited !== 0)
          throw new Error('External writer did not complete')
        externalVersion = hash(await filesystem.readFile(path, 'utf8'))
        return realRename(...args)
      },
    }))
    const { createDiagramService } = await import('../../../src/modules/diagrams')
    const config: FileConfig = { projectRoot: fixture, limits: { maxFileBytes: 2048, maxTreeEntries: 100, maxTreeDepth: 8, maxBlocks: 20, pollIntervalMs: 1000, sessionTtlSeconds: 3600, maxSessions: 100 } }
    const service = await createDiagramService(config)
    const original = await service.readDocument('diagram.mmd')
    const saved = await service.saveDiagram({ path: original.path, selector: original.blocks[0]!.selector, expectedVersion: original.version, source: submitted })
    const finalVersion = hash(await filesystem.readFile(path, 'utf8'))
    const externalChangeOverwritten = interceptionCount === 1 && versionAtRename === original.version && externalVersion === hash(external) && saved.version === hash(submitted) && finalVersion === saved.version
    process.stdout.write(`${JSON.stringify({
      risk: 'OPEN: uncooperative external write between final comparison and rename',
      serviceSaveSucceeded: true,
      externalChangeOverwritten,
      interceptionCount,
      expectedVersion: original.version,
      versionAtRename,
      externalVersion,
      returnedVersion: saved.version,
      finalVersion,
      temporaryEntriesRemaining: (await filesystem.readdir(fixture)).filter(name => name.startsWith('.merdeck-')).length,
    }, null, 2)}\n`)
    if (!externalChangeOverwritten)
      throw new Error('Expected race outcome changed; reassess the diagnostic')
  }
  finally {
    await filesystem.rm(fixture, { recursive: true, force: true })
  }
}

reproduce().catch(() => {
  process.stderr.write('External-writer diagnostic failed; no acceptance result is established.\n')
  process.exitCode = 1
})
