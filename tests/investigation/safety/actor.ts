import assert from 'node:assert/strict'
import { constants } from 'node:fs'
import { open, rename, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { errorCode, external, hash, safeActorPath, snapshot } from './support'

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, constants.O_RDONLY | constants.O_DIRECTORY)
  try {
    await handle.sync()
  }
  finally { await handle.close() }
}
async function main(): Promise<void> {
  const [base, operation, target, value = external] = process.argv.slice(2)
  assert(base && operation && target)
  await safeActorPath(base, target)
  const before = await snapshot(target)
  let descriptor: unknown = null
  let operationError: string | null = null
  if (operation === 'hold') {
    const handle = await open(target, 'r+')
    try {
      process.stdout.write('ready\n')
      assert.equal(await new Response(Bun.stdin.stream()).text(), 'write')
      let writeError: string | null = null
      try {
        await handle.truncate(0)
        await handle.writeFile(value)
        await handle.sync()
      }
      catch (error) {
        // Some mounted filesystems reject operations on an unlinked inode.
        assert.equal(errorCode(error), 'ENOENT')
        writeError = errorCode(error)
      }
      const stat = await handle.stat({ bigint: true }).catch((error: unknown) => {
        assert.equal(errorCode(error), 'ENOENT')
        return null
      })
      descriptor = { openedDev: before.dev, openedIno: before.ino, dev: stat ? String(stat.dev) : null, ino: stat ? String(stat.ino) : null, nlink: stat ? String(stat.nlink) : null, hash: writeError ? null : hash(value), writeError }
    }
    finally { await handle.close() }
  }
  else if (operation === 'write' || operation === 'probe-create') {
    try {
      const handle = await open(target, operation === 'probe-create' ? 'wx' : 'w')
      try {
        await handle.writeFile(value)
        await handle.sync()
      }
      finally { await handle.close() }
    }
    catch (error) {
      if (operation !== 'probe-create' || !['EACCES', 'EPERM'].includes(errorCode(error)))
        throw error
      operationError = errorCode(error)
    }
  }
  else if (operation === 'replace') {
    const temporary = `${target}.external-tmp`
    await safeActorPath(base, temporary)
    const handle = await open(temporary, 'wx', 0o600)
    try {
      await handle.writeFile(value)
      await handle.sync()
    }
    finally { await handle.close() }
    await rename(temporary, target)
  }
  else if (operation === 'delete') {
    await unlink(target)
  }
  else if (operation === 'move') {
    await safeActorPath(base, value)
    await rename(target, value)
    await syncDirectory(dirname(value))
  }
  else {
    assert.equal(operation, 'observe')
  }
  await syncDirectory(dirname(target))
  process.stdout.write(`${JSON.stringify({ pid: process.pid, operation, before, after: await snapshot(target), descriptor, operationError })}\n`)
}
main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
