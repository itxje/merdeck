import { Buffer } from 'node:buffer'
import { fstatSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { afterEach, expect, test } from 'bun:test'
import { createFixture, removeFixture } from '../../../tests/integration/files/fixtures'
import { createNativeRuntime, initializeNativeDirectory, nativeByteCount, NativeDirectory, nativeDirectoryError, parseNativeRecord, validateLibcVersion, validateNativePlatform } from './native-directory'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await removeFixture(root)
})
function record(name: Uint8Array, length = 32) {
  const bytes = new Uint8Array(length)
  new DataView(bytes.buffer).setUint16(16, length, true)
  bytes.set(name, 19)
  return bytes
}
test('raw records validate bounds before returning copied names', () => {
  expect(parseNativeRecord(record(Buffer.from('file.md')), 32, 0)).toEqual({ next: 32, name: 'file.md' })
  expect(parseNativeRecord(record(Buffer.from([255])), 32, 0).name).toBe('')
  expect(parseNativeRecord(record(Buffer.from('.')), 32, 0).name).toBe('.')
  expect(parseNativeRecord(record(Buffer.from('..')), 32, 0).name).toBe('..')
  for (const [used, offset] of [[33, 0], [-1, 0], [32, -1], [32, 16], [0, 0], [31.5, 0]])
    expect(() => parseNativeRecord(record(Buffer.from('x')), used!, offset!)).toThrow()
  for (const length of [0, 16, 25, 40]) {
    const bytes = record(Buffer.from('x'))
    new DataView(bytes.buffer).setUint16(16, length, true)
    expect(() => parseNativeRecord(bytes, 32, 0)).toThrow()
  }
  for (const name of [Buffer.from(''), Buffer.from('bad/name'), Buffer.from('abcdefghijklm')])
    expect(() => parseNativeRecord(record(name), 32, 0)).toThrow()
})
test('initialization rejects incompatible ABIs and maps loader details safely', () => {
  for (const [platform, architecture, endian, bun] of [['darwin', 'arm64', 'LE', '1.4.2'], ['linux', 'ia32', 'LE', '1.4.2'], ['linux', 'x64', 'BE', '1.4.2'], ['linux', 'arm64', 'LE', '1.4.1']])
    expect(() => validateNativePlatform(platform!, architecture!, endian!, bun!)).toThrow()
  expect(() => createNativeRuntime(() => {
    throw new Error('/private/lib secret')
  })).toThrow('The project is temporarily unavailable.')
})
test('the native stream owns a descriptor and returns records without content access', async () => {
  const root = await createFixture('files-native-directory-')
  roots.push(root)
  await mkdir(`${root}/folder`)
  await writeFile(`${root}/file.md`, 'not read')
  const stream = NativeDirectory.open(root)
  try {
    const names = []
    for (let name = await stream.read(() => {}); name !== null; name = await stream.read(() => {}))
      names.push(name)
    expect(names.sort()).toEqual(['.', '..', 'file.md', 'folder'])
    expect(await stream.read(() => {})).toBeNull()
  }
  finally {
    await stream.close()
    await stream.close()
  }
  await expect(stream.read(() => {})).rejects.toThrow()
})

test('libc versions, byte counts and errno fail closed without retry', () => {
  for (const version of ['2.30', '2.31', '2.41'])
    expect(() => validateLibcVersion(version)).not.toThrow()
  for (const version of ['2.29', 'musl 1.2', '', '2.30 trailing'])
    expect(() => validateLibcVersion(version)).toThrow()
  for (const count of [4097, -1, 2.5, 32n, Number.NaN])
    expect(() => nativeByteCount(count)).toThrow()
  expect(nativeByteCount(0)).toBe(0)
  expect(nativeByteCount(4096)).toBe(4096)
  expect(nativeDirectoryError(4).code).toBe('unavailable') // EINTR terminates this continuation.
  expect(nativeDirectoryError(13).code).toBe('forbidden')
  expect(nativeDirectoryError(2).code).toBe('directory_changed')
  const runtime = initializeNativeDirectory()
  expect(() => runtime.refill(-1, new Uint8Array(4096))).toThrow('The project is temporarily unavailable.')
})

test('post-native abort yields before publication and close waits for the active read', async () => {
  const root = await createFixture('files-native-abort-')
  roots.push(root)
  const native = initializeNativeDirectory()
  const controller = new AbortController()
  let calls = 0
  let closes = 0
  const stream = NativeDirectory.open(root, {
    ...native,
    refill(fd, bytes) {
      calls++
      const count = native.refill(fd, bytes)
      setImmediate(() => controller.abort())
      return count
    },
    close(fd) {
      closes++
      native.close(fd)
    },
  })
  const reading = stream.read(() => controller.signal.throwIfAborted())
  await expect(stream.read(() => {})).rejects.toThrow()
  const closing = stream.close()
  expect(closes).toBe(0)
  await expect(reading).rejects.toThrow()
  await closing
  await stream.close()
  expect([calls, closes]).toEqual([1, 1])
  expect(() => fstatSync(stream.descriptor)).toThrow()
})

test('close failure does not retry a potentially reused Linux descriptor', async () => {
  const root = await createFixture('files-native-close-')
  roots.push(root)
  const native = initializeNativeDirectory()
  let closes = 0
  const stream = NativeDirectory.open(root, {
    ...native,
    close(fd) {
      closes++
      native.close(fd)
      throw nativeDirectoryError(4)
    },
  })
  await expect(stream.close()).rejects.toThrow()
  await expect(stream.close()).rejects.toThrow()
  expect(closes).toBe(1)
  expect(() => fstatSync(stream.descriptor)).toThrow()
})

test('buffered records are independent strings; malformed refill fails with owned cleanup', async () => {
  const root = await createFixture('files-native-record-')
  roots.push(root)
  const native = initializeNativeDirectory()
  let calls = 0
  const stream = NativeDirectory.open(root, {
    ...native,
    refill(_fd, bytes) {
      calls++
      bytes.fill(0)
      bytes.set(record(Buffer.from(calls === 1 ? 'first.md' : 'next.md')))
      if (calls === 3)
        bytes.fill(255)
      return 32
    },
  })
  try {
    const first = await stream.read(() => {})
    expect(await stream.read(() => {})).toBe('next.md')
    expect(first).toBe('first.md')
    await expect(stream.read(() => {})).rejects.toThrow()
  }
  finally { await stream.close() }
  expect(() => fstatSync(stream.descriptor)).toThrow()
})
