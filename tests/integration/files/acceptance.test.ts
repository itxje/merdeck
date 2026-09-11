import type { FileConfig } from '../../../src/modules/diagrams'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { createDiagramService } from '../../../src/modules/diagrams'
import { safeError } from '../../../src/shared/errors'
import { createFixture, removeFixture } from './fixtures'

test('configured service exports preserve whole-file contracts for transport consumers', async () => {
  const fixture = await createFixture('files-contract-')
  try {
    const config: FileConfig = { projectRoot: fixture, limits: { maxFileBytes: 2048, maxTreeEntries: 100, maxTreeDepth: 8, maxBlocks: 20, pollIntervalMs: 1000, sessionTtlSeconds: 3600, maxSessions: 100 } }
    const source = '\uFEFF# Unicode π\r\n~~~mermaid\r\ngraph TD\r\n~~~\r\nUntouched'
    await writeFile(join(fixture, 'document.md'), source)
    const service = await createDiagramService(config)
    const document = await service.readDocument('document.md')
    const saved = await service.saveDiagram({ path: document.path, selector: document.blocks[0]!.selector, expectedVersion: document.version, source: 'graph LR\nA-->B' })
    const expected = source.replace('graph TD\r\n', 'graph LR\r\nA-->B\r\n')
    expect(await readFile(join(fixture, 'document.md'), 'utf8')).toBe(expected)
    expect(saved.version).toBe(createHash('sha256').update(Buffer.from(expected)).digest('hex'))
    const snapshot = await service.treeSnapshot({ refresh: true })
    expect(snapshot.entries[0]).toMatchObject({ path: saved.path, version: saved.version })
    expect(snapshot.entries[0]).not.toHaveProperty('source')
    expect(safeError(new Error(`${fixture}: ${source}`)).toResponse()).toEqual({ code: 'internal_error', message: 'An unexpected error occurred.' })
  }
  finally {
    await removeFixture(fixture)
  }
})

test('ordinary README contexts retain multiple byte-exact independently saved diagrams', async () => {
  const fixture = await createFixture('files-markdown-context-')
  try {
    const config: FileConfig = { projectRoot: fixture, limits: { maxFileBytes: 8192, maxTreeEntries: 100, maxTreeDepth: 8, maxBlocks: 20, pollIntervalMs: 1000, sessionTtlSeconds: 3600, maxSessions: 100 } }
    const prefix = '\uFEFF# Guide π 😀\r\n\r\n- Bullet\r\n\r\n1. Ordered\r\n\r\n> Quote\r\n\r\n[Link](guide.md)\r\n\r\n[reference]: /guide "Guide"\r\n\r\n'
    const first = '```mermaid\r\nfirst\r\n```\r\n'
    const middle = '\r\n<div>\r\n```mermaid\r\nhidden in HTML\r\n```\r\n</div>\r\n\r\n- Nested diagram\r\n\r\n  ~~~mermaid\r\n  hidden in list\r\n  ~~~\r\n\r\n'
    const second = '~~~mermaid\r\nsecond\r\n~~~'
    await writeFile(join(fixture, 'README.md'), prefix + first + middle + second)
    const service = await createDiagramService(config)
    const original = await service.readDocument('README.md')
    expect(original.blocks.map(block => block.source)).toEqual(['first\r\n', 'second\r\n'])
    expect((await service.treeSnapshot()).entries[0]).toMatchObject({ state: 'available', blocks: [{ label: 'Diagram 1' }, { label: 'Diagram 2' }] })
    const savedFirst = await service.saveDiagram({ path: original.path, expectedVersion: original.version, selector: original.blocks[0]!.selector, source: 'changed π\nnext 😀' })
    const newFirst = first.replace('first\r\n', 'changed π\r\nnext 😀\r\n')
    expect((await readFile(join(fixture, 'README.md'))).equals(Buffer.from(prefix + newFirst + middle + second))).toBe(true)
    expect(savedFirst.blocks[1]?.source).toBe('second\r\n')
    const savedSecond = await service.saveDiagram({ path: original.path, expectedVersion: savedFirst.version, selector: savedFirst.blocks[1]!.selector, source: 'changed second' })
    const expected = prefix + newFirst + middle + second.replace('second\r\n', 'changed second\r\n')
    expect((await readFile(join(fixture, 'README.md'))).equals(Buffer.from(expected))).toBe(true)
    expect(savedSecond.version).toBe(createHash('sha256').update(Buffer.from(expected)).digest('hex'))
    await expect(service.saveDiagram({ path: original.path, expectedVersion: original.version, selector: original.blocks[1]!.selector, source: 'stale' })).rejects.toMatchObject({ code: 'conflict' })
    await expect(service.saveDiagram({ path: original.path, expectedVersion: savedSecond.version, selector: savedSecond.blocks[1]!.selector, source: '~~~\ninjection' })).rejects.toMatchObject({ code: 'unsupported' })
    expect((await readFile(join(fixture, 'README.md'))).equals(Buffer.from(expected))).toBe(true)
  }
  finally {
    await removeFixture(fixture)
  }
})
