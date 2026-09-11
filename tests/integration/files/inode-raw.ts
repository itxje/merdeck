import type { BigIntStats } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { constants, fstatSync, lstatSync } from 'node:fs'
import { lstat, mkdir, mkdtemp, open, opendir, readdir, readFile, realpath, rename, rm, statfs, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { metadata } from './inode-metadata.ts'

// Same built-in filesystem probe under either runtime; no parser or test runner.
async function run() {
  const output = process.env.MERDECK_INODE_TRACE
  if (!output || !resolve(output).startsWith(`${resolve('tmp')}/`))
    throw new Error('Diagnostic output must be inside project scratch')
  await mkdir(resolve('tmp'), { recursive: true })
  const fixture = await mkdtemp(resolve('tmp/files-inode-raw-'))
  const path = join(fixture, 'README.md')
  const events: object[] = []
  const boundarySnapshots = process.argv.includes('--boundary-snapshots')
  let stage = 'setup'
  let succeeded = false
  const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
  const event = (details: object) => events.push({ sequence: events.length + 1, stage, ...details })
  const prefix = '\uFEFF# Guide π 😀\r\n\r\n- Bullet\r\n\r\n1. Ordered\r\n\r\n> Quote\r\n\r\n[Link](guide.md)\r\n\r\n[reference]: /guide "Guide"\r\n\r\n'
  const first = '```mermaid\r\nfirst\r\n```\r\n'
  const middle = '\r\n<div>\r\n```mermaid\r\nhidden in HTML\r\n```\r\n</div>\r\n\r\n- Nested diagram\r\n\r\n  ~~~mermaid\r\n  hidden in list\r\n  ~~~\r\n\r\n'
  const second = '~~~mermaid\r\nsecond\r\n~~~'
  const contents = [
    Buffer.from(prefix + first + middle + second),
    Buffer.from(prefix + first.replace('first\r\n', 'changed π\r\nnext 😀\r\n') + middle + second),
    Buffer.from(prefix + first.replace('first\r\n', 'changed π\r\nnext 😀\r\n') + middle + second.replace('second\r\n', 'changed second\r\n')),
  ]
  const rootIdentity = await lstat(fixture, { bigint: true })
  const filesystemType = `0x${(await statfs(fixture, { bigint: true })).type.toString(16)}`
  const same = (a: BigIntStats, b: BigIntStats) => a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs
  async function inspect(handle: FileHandle, name: string) {
    const stat = await handle.stat({ bigint: true })
    event({ operation: 'fstat', fd: handle.fd, name, metadata: metadata(stat) })
    if (boundarySnapshots)
      event({ operation: 'fstatSync', fd: handle.fd, name, metadata: metadata(fstatSync(handle.fd, { bigint: true })) })
    return stat
  }
  function boundary(operation: string, anchor: string, temporary?: FileHandle) {
    if (!boundarySnapshots)
      return
    event({ operation, name: 'target:direct', metadata: metadata(lstatSync(path, { bigint: true })) })
    event({ operation, name: 'target:anchored', metadata: metadata(lstatSync(`${anchor}/README.md`, { bigint: true })) })
    if (temporary)
      event({ operation, name: 'temporary', fd: temporary.fd, metadata: metadata(fstatSync(temporary.fd, { bigint: true })) })
  }
  async function pathStat(target: string, name: string) {
    const stat = await lstat(target, { bigint: true })
    event({ operation: 'lstat', name, metadata: metadata(stat) })
    return stat
  }
  async function validate(directory: FileHandle) {
    const root = await pathStat(fixture, 'root')
    assert.equal(root.ino, rootIdentity.ino)
    assert.equal(root.dev, rootIdentity.dev)
    assert.equal(root.birthtimeNs, rootIdentity.birthtimeNs)
    assert.equal(await realpath(fixture), fixture)
    assert.equal(await realpath(`/proc/self/fd/${directory.fd}`), fixture)
    const descriptor = await inspect(directory, 'root')
    assert.equal(root.ino, descriptor.ino)
  }
  async function withDirectory<T>(action: (handle: FileHandle, anchor: string) => Promise<T>) {
    const handle = await open(fixture, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
    event({ operation: 'open:directory', fd: handle.fd })
    try {
      await validate(handle)
      return await action(handle, `/proc/self/fd/${handle.fd}`)
    }
    finally {
      event({ operation: 'close:directory', fd: handle.fd })
      await handle.close()
    }
  }
  async function read(directory: FileHandle, anchor: string) {
    await validate(directory)
    const target = `${anchor}/README.md`
    const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    event({ operation: 'open:read', fd: handle.fd })
    try {
      const before = await inspect(handle, 'target')
      assert.equal(before.nlink, 1n)
      await validate(directory)
      assert(same(before, await pathStat(target, 'target:anchored')))
      const buffer = Buffer.alloc(8193)
      let length = 0
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length)
        event({ operation: 'read', fd: handle.fd, bytesRead })
        if (!bytesRead)
          break
        length += bytesRead
      }
      const after = await inspect(handle, 'target')
      await validate(directory)
      assert(same(before, after))
      assert(same(after, await pathStat(target, 'target:anchored')))
      const bytes = buffer.subarray(0, length)
      event({ operation: 'read:complete', hash: hash(bytes) })
      return { stat: after, bytes }
    }
    finally {
      event({ operation: 'close:read', fd: handle.fd })
      await handle.close()
    }
  }
  try {
    await writeFile(path, contents[0]!)
    event({ operation: 'writeFile:initial', hash: hash(contents[0]!) })
    await withDirectory(async () => {})
    await withDirectory(read)
    stage = 'tree'
    await withDirectory(async (directory, anchor) => {
      await validate(directory)
      for await (const entry of await opendir(anchor, { bufferSize: 1 })) {
        await validate(directory)
        event({ operation: 'opendir:entry', name: entry.name })
      }
    })
    await withDirectory(read)
    for (let index = 1; index <= 2; index++) {
      stage = `save:${index}`
      await withDirectory(async (directory, anchor) => {
        const original = await read(directory, anchor)
        assert(original.bytes.equals(contents[index - 1]!))
        const temporary = `${anchor}/.merdeck-${randomUUID()}.tmp`
        await validate(directory)
        boundary('before:temporary-open', anchor)
        const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
        event({ operation: 'open:temporary', fd: handle.fd })
        let owned = true
        try {
          boundary('after:temporary-open', anchor, handle)
          await handle.writeFile(contents[index]!)
          boundary('after:temporary-write', anchor, handle)
          event({ operation: 'writeFile:temporary', fd: handle.fd, hash: hash(contents[index]!) })
          const tempStat = await inspect(handle, 'temporary')
          if (tempStat.uid !== original.stat.uid || tempStat.gid !== original.stat.gid)
            await handle.chown(Number(original.stat.uid), Number(original.stat.gid))
          await handle.chmod(Number(original.stat.mode & 0o777n))
          boundary('after:temporary-chmod', anchor, handle)
          await handle.sync()
          boundary('after:temporary-sync', anchor, handle)
          event({ operation: 'sync:temporary', fd: handle.fd })
          const current = await read(directory, anchor)
          event({ operation: 'compare', original: metadata(original.stat), current: metadata(current.stat), equalContent: original.bytes.equals(current.bytes) })
          assert(original.bytes.equals(current.bytes), 'Content changed during preparation')
          assert(same(original.stat, current.stat), 'Identity or metadata changed during preparation')
          await validate(directory)
          assert.equal((await pathStat(temporary, 'temporary')).ino, tempStat.ino)
          event({ operation: 'rename:begin', sourceInode: String(tempStat.ino) })
          await rename(temporary, `${anchor}/README.md`)
          owned = false
          event({ operation: 'rename:end' })
          boundary('after:rename', anchor, handle)
          await directory.sync()
          event({ operation: 'sync:directory', fd: directory.fd })
        }
        finally {
          if (owned) {
            await unlink(temporary)
            event({ operation: 'unlink:temporary' })
          }
          event({ operation: 'close:temporary', fd: handle.fd })
          await handle.close()
        }
      })
      const bytes = await readFile(path)
      event({ operation: 'readFile:direct', hash: hash(bytes) })
      assert(bytes.equals(contents[index]!))
    }
    succeeded = true
  }
  catch (error) {
    event({ operation: 'failure', message: error instanceof Error ? error.message : 'unknown' })
    process.exitCode = 1
  }
  finally {
    const temporaryEntriesRemaining = (await readdir(fixture)).filter(name => name.startsWith('.merdeck-')).length
    await rm(fixture, { recursive: true, force: true })
    const removed = await lstat(fixture).then(() => false, (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
    const result = { pid: process.pid, versions: { bun: process.versions.bun ?? null, node: process.versions.node }, filesystemType, boundarySnapshots, succeeded, temporaryEntriesRemaining, fixtureRemoved: removed, events }
    await writeFile(output, `${JSON.stringify(result, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ pid: process.pid, succeeded, temporaryEntriesRemaining, fixtureRemoved: removed })}\n`)
  }
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Raw probe failed'}\n`)
  process.exitCode = 1
})
