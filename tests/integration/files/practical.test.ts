import { Buffer } from 'node:buffer'
import { mkdir, readdir, readFile, rename, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { createDiagramService } from '../../../src/modules/diagrams'
import { inspectFilesystem, requireWritableFilesystem } from '../../../src/modules/diagrams/filesystem'
import { errorStatus, safeError } from '../../../src/shared/errors'
import { createFixture, fixtureLimits, fixtureParent, removeFixture } from './fixtures'

test('twenty consecutive standalone saves retain BOM CRLF and fresh revisions', async () => {
  const root = await createFixture('files-standalone-')
  try {
    await writeFile(join(root, 'flow.mermaid'), '\uFEFFgraph TD\r\nA-->B\r\n')
    const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits })
    expect(await service.storageStatus()).toMatchObject({ writable: true, filesystemType: process.env.MERDECK_TEST_EXPECTED_FS ?? '0x794c7630' })
    let document = await service.readDocument('flow.mermaid')
    for (let iteration = 1; iteration <= 20; iteration++) {
      const before = await service.treeSnapshot()
      const source = `graph TD\nA-->Node${iteration}\n`
      document = await service.saveDiagram({ path: document.path, selector: document.blocks[0]!.selector, expectedVersion: document.version, source })
      expect(await readFile(join(root, document.path))).toEqual(Buffer.from(`\uFEFF${source.replaceAll('\n', '\r\n')}`))
      expect(await service.documentRevision(document.path)).toEqual({ path: document.path, state: 'present', version: document.version })
      expect((await service.treeSnapshot()).revision).not.toBe(before.revision)
    }
    expect(await readdir(root)).toEqual(['flow.mermaid'])
  }
  finally {
    await removeFixture(root)
  }
})

test('twenty consecutive multi-block save pairs preserve every surrounding byte', async () => {
  const root = await createFixture('files-multi-')
  try {
    const prefix = '\uFEFF# Guide π\r\n\r\n- Item\r\n\r\n```mermaid\r\n'
    const middle = '```\r\n\r\n> Keep this\r\n\r\n~~~mermaid\r\n'
    const suffix = '~~~\r\nUntouched 😀'
    let first = 'graph TD\r\n'
    let second = 'graph LR\r\n'
    await writeFile(join(root, 'guide.md'), prefix + first + middle + second + suffix)
    const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits })
    let document = await service.readDocument('guide.md')
    for (let iteration = 1; iteration <= 20; iteration++) {
      first = `graph TD\r\nA-->First${iteration}\r\n`
      document = await service.saveDiagram({ path: document.path, selector: document.blocks[0]!.selector, expectedVersion: document.version, source: first.replaceAll('\r\n', '\n') })
      expect(await readFile(join(root, document.path))).toEqual(Buffer.from(prefix + first + middle + second + suffix))
      second = `graph LR\r\nA-->Second${iteration}\r\n`
      document = await service.saveDiagram({ path: document.path, selector: document.blocks[1]!.selector, expectedVersion: document.version, source: second })
      expect(await readFile(join(root, document.path))).toEqual(Buffer.from(prefix + first + middle + second + suffix))
      expect((await service.readDocument(document.path)).version).toBe(document.version)
    }
    expect(await readdir(root)).toEqual(['guide.md'])
  }
  finally {
    await removeFixture(root)
  }
})

test.each(['in-place', 'atomic'])('external %s editor before final validation preserves its content and the submitted draft', async (mode) => {
  const root = await createFixture('files-external-')
  try {
    await writeFile(join(root, 'flow.mmd'), 'graph TD\nInitial-->Value\n')
    const external = 'graph LR\nExternal-->Value\n'
    const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits }, { repositoryHooks: { afterTempWrite: async () => {
      const child = Bun.spawn([process.execPath, '-e', 'import {open,rename} from "node:fs/promises"; const [p,mode,content]=process.argv.slice(1); const output=mode==="atomic"?p+".external":p; const f=await open(output,"w"); try {await f.writeFile(content); await f.sync()} finally {await f.close()} if(mode==="atomic") await rename(output,p);', join(root, 'flow.mmd'), mode, external], { stdout: 'inherit', stderr: 'inherit', timeout: 4000 })
      expect(await child.exited).toBe(0)
    } } })
    const document = await service.readDocument('flow.mmd')
    const draft = { path: document.path, selector: document.blocks[0]!.selector, expectedVersion: document.version, source: 'graph LR\nDraft-->Retained\n' }
    await expect(service.saveDiagram(draft)).rejects.toMatchObject({ code: 'conflict' })
    expect(draft.source).toBe('graph LR\nDraft-->Retained\n')
    expect(await readFile(join(root, document.path), 'utf8')).toBe(external)
    expect(await readdir(root)).toEqual(['flow.mmd'])
  }
  finally {
    await removeFixture(root)
  }
})

test('real unsupported filesystem stays readable and visibly refuses all writes before temporary creation', async () => {
  const root = await createFixture('files-unsupported-', true)
  try {
    await mkdir(join(root, 'nested'))
    await writeFile(join(root, 'nested', 'flow.mmd'), 'graph TD\nKeep-->Bytes\n')
    const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits })
    const status = await service.storageStatus()
    expect(status.writable).toBe(false)
    expect(status.filesystemType).toBe(process.env.MERDECK_TEST_UNSUPPORTED_FS ?? '0x6a656a63')
    process.stdout.write(`${JSON.stringify({ unsupportedWriteContract: status })}\n`)
    const document = await service.readDocument('nested/flow.mmd')
    const request = { path: document.path, selector: document.blocks[0]!.selector, expectedVersion: document.version, source: 'replace' }
    for (const expectedVersion of [document.version, 'a'.repeat(64)]) {
      try {
        await service.saveDiagram({ ...request, expectedVersion })
        throw new Error('Unsupported write unexpectedly succeeded')
      }
      catch (error) {
        expect(safeError(error).toResponse()).toEqual({ code: 'filesystem_unsupported', message: 'Saving is unavailable on this filesystem. Ask the operator to verify write support for the configured project.' })
      }
    }
    for (const operation of [
      () => service.createEntry({ kind: 'file', path: 'nested/new.mmd' }),
      () => service.createEntry({ kind: 'directory', path: 'nested/folder' }),
      () => service.moveEntry({ kind: 'file', from: document.path, to: 'nested/moved.mmd', expectedVersion: document.version }),
      () => service.moveEntry({ kind: 'directory', from: 'nested', to: 'moved' }),
      () => service.deleteEntry({ kind: 'file', path: document.path, expectedVersion: document.version }),
      () => service.deleteEntry({ kind: 'directory', path: 'nested' }),
    ])
      await expect(operation()).rejects.toMatchObject({ code: 'filesystem_unsupported' })
    expect(await readdir(root)).toEqual(['nested'])
    expect(errorStatus.filesystem_unsupported).toBe(503)
    expect(await readFile(join(root, document.path), 'utf8')).toBe(document.blocks[0]!.source)
    expect(await readdir(join(root, 'nested'))).toEqual(['flow.mmd'])
    expect((await service.treeSnapshot()).entries).toContainEqual(expect.objectContaining({ path: document.path, state: 'available' }))
    await rename(root, `${root}-moved`)
    try {
      await expect(service.storageStatus()).rejects.toMatchObject({ code: 'unavailable' })
    }
    finally {
      await rename(`${root}-moved`, root)
    }
  }
  finally {
    await removeFixture(root)
  }
})

test('filesystem eligibility rejects a different device and fixture configuration rejects symlink aliases', async () => {
  const root = await createFixture('files-contract-boundary-')
  try {
    const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits })
    const status = await service.storageStatus()
    expect((await inspectFilesystem(root, BigInt(status.device), BigInt(status.device) + 1n)).writable).toBe(false)
    await expect(requireWritableFilesystem(root, BigInt(status.device), BigInt(status.device) + 1n)).rejects.toMatchObject({ code: 'filesystem_unsupported' })
    const previous = process.env.MERDECK_TEST_FIXTURE_PARENT
    await symlink(root, join(root, 'alias'))
    try {
      process.env.MERDECK_TEST_FIXTURE_PARENT = join(root, 'alias')
      await expect(fixtureParent()).rejects.toThrow('canonical absolute directory')
    }
    finally {
      if (previous === undefined)
        delete process.env.MERDECK_TEST_FIXTURE_PARENT
      else
        process.env.MERDECK_TEST_FIXTURE_PARENT = previous
    }
  }
  finally {
    await removeFixture(root)
  }
})
