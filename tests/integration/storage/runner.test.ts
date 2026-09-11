import { Buffer } from 'node:buffer'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { descriptorMount, nativeArguments, requireNative, storageIdentity } from '../../../scripts/storage-support'
import { createFixture, fixtureParent, removeFixture } from '../files/fixtures'

test('native runner rejects absent, ambiguous and non-native candidate arguments', () => {
  for (const args of [[], ['/tmp'], ['/tmp', '--filesystem', 'overlay'], ['/tmp', '--filesystem', 'ext4', '--bypass']])
    expect(() => nativeArguments(args)).toThrow('Usage:')
})

test('mount identification uses the held descriptor, including escaped mount points', () => {
  const mount = descriptorMount('pos:\t0\nmnt_id:\t42\n', '41 1 0:70 / / rw - overlay overlay rw\n42 1 8:1 / /mnt/native\\040disk rw - ext4 /dev/test rw')
  expect(mount).toEqual({ id: '42', device: '8:1', mountPoint: '/mnt/native disk', filesystem: 'ext4' })
  expect(() => descriptorMount('mnt_id:\t99\n', '')).toThrow('no identifiable mount')
})

test('native mismatch is a real failing CLI control with no target fixture writes', async () => {
  const parent = await fixtureParent(true)
  const parentIdentity = await storageIdentity(parent)
  // Evidence is written independently under project tmp, which may also be the configured parent.
  const target = await createFixture('files-native-refusal-', true)
  try {
    const identity = await storageIdentity(target)
    expect(identity.filesystemType).toBe(process.env.MERDECK_TEST_UNSUPPORTED_FS ?? '0x6a656a63')
    expect(identity).toMatchObject({ device: parentIdentity.device, mount: parentIdentity.mount })
    expect(() => requireNative(identity, nativeArguments([target, '--filesystem', 'ext4']))).toThrow('Native target mismatch')
    const sentinel = join(target, 'preserve.bin')
    const bytes = Buffer.from([0, 255, 13, 10, 65])
    await writeFile(sentinel, bytes)
    const before = await readdir(target)
    const child = Bun.spawn([process.execPath, 'scripts/check-storage.ts', target, '--filesystem', 'ext4'], { stdout: 'pipe', stderr: 'pipe', timeout: 10000 })
    const output = await new Response(child.stdout).text()
    expect(await child.exited).toBe(1)
    const last = JSON.parse(output.trim().split('\n').at(-1)!)
    expect(last).toMatchObject({ nativeSourceChecks: 'failed', nativeAcceptance: 'pending', cleanup: true, stages: [] })
    expect(last.failure).toContain('Native target mismatch')
    expect(await readdir(target)).toEqual(before)
    expect(await readFile(sentinel)).toEqual(bytes)
    process.stdout.write(output)
  }
  finally {
    await removeFixture(target)
  }
})

test('native matching requires both ext4 mount type and magic, never its backing device label', () => {
  const expected = nativeArguments(['/explicit/fixture', '--filesystem', 'ext4'])
  const identity = { root: expected.parent, device: '2049', filesystemType: expected.magic, mount: { id: '1', device: '8:1', mountPoint: '/', filesystem: 'overlay' } }
  expect(() => requireNative(identity, expected)).toThrow('Native target mismatch')
  expect(() => requireNative({ ...identity, mount: { ...identity.mount, filesystem: 'ext2' } }, expected)).toThrow('Native target mismatch')
  expect(() => requireNative({ ...identity, mount: { ...identity.mount, filesystem: 'ext4', device: '8:2' } }, expected)).toThrow('Native target mismatch')
  expect(() => requireNative({ ...identity, mount: { ...identity.mount, filesystem: 'ext4' } }, expected)).not.toThrow()
})
