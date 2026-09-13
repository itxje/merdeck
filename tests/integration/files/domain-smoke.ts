import assert from 'node:assert/strict'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createFixtureService as createDiagramService, createFixture, fixtureLimits, removeFixture } from './fixtures'

async function run() {
  const root = await createFixture('files-domain-smoke-')
  try {
    const path = join(root, 'guide.md')
    const original = '# Guide\n```mermaid\ngraph TD\n```\nKeep\n~~~mermaid\ngraph LR\n~~~\n'
    await writeFile(path, original)
    const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits })
    const storage = await service.storageStatus()
    assert.equal(storage.writable, true)
    const document = await service.readDocument('guide.md')
    assert.equal(document.blocks.length, 2)
    const before = await service.treeSnapshot()
    const saved = await service.saveDiagram({ path: document.path, selector: document.blocks[1]!.selector, expectedVersion: document.version, source: 'graph LR\nSaved-->Value\n' })
    assert.equal(await readFile(path, 'utf8'), original.replace('graph LR\n', 'graph LR\nSaved-->Value\n'))
    assert.notEqual((await service.treeSnapshot()).revision, before.revision)
    const external = original.replace('graph TD\n', 'graph TD\nExternal-->Value\n')
    await writeFile(`${path}.external`, external)
    await rename(`${path}.external`, path)
    assert.notEqual((await service.documentRevision(document.path)).state === 'present' ? (await service.readDocument(document.path)).version : '', saved.version)
    assert.equal((await service.readDocument(document.path)).blocks[0]!.source, 'graph TD\nExternal-->Value\n')
    await assert.rejects(service.saveDiagram({ path: document.path, selector: saved.blocks[1]!.selector, expectedVersion: saved.version, source: 'stale draft' }), { code: 'conflict' })
    process.stdout.write(`${JSON.stringify({ domainSmokePassed: true, runtime: Bun.version, storage, selectedBlocks: 2, externalRefreshObserved: true, rendering: 'not exercised' })}\n`)
  }
  finally {
    await removeFixture(root)
  }
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : 'Domain smoke failed'}\n`)
  process.exitCode = 1
})
