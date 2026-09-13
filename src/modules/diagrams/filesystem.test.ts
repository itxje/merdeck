import { constants } from 'node:fs'
import { open, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, spyOn, test } from 'bun:test'
import { createFixtureService as createDiagramService, createFixture, fixtureLimits, removeFixture } from '../../../tests/integration/files/fixtures'
import { admittedIdentity, inspectFilesystem, requireWritableFilesystem, retained, writableFilesystem } from './filesystem'
import * as mounts from './mount'

const ext4Record = '27 1 8:1 / / rw,relatime - ext4 /dev/root rw'
const ext4 = mounts.descriptorMount('pos:\t0\nmnt_id:\t27\n', ext4Record)

test.each([
  { platform: 'linux', type: 0xEF53n, device: 2049n, root: 2049n, mount: ext4, writable: true },
  { platform: 'linux', type: 0x794C7630n, device: 70n, root: 70n, mount: { ...ext4, device: '0:70', filesystem: 'overlay' }, writable: true },
  ...['ext2', 'ext3', 'xfs', 'fakeowner', 'tmpfs', 'overlay'].map(filesystem => ({ platform: 'linux', type: 0xEF53n, device: 2049n, root: 2049n, mount: { ...ext4, filesystem }, writable: false })),
  { platform: 'linux', type: 0x794C7630n, device: 2049n, root: 2049n, mount: ext4, writable: false },
  { platform: 'linux', type: 0x1021994n, device: 26n, root: 26n, mount: { ...ext4, device: '0:26', filesystem: 'tmpfs' }, writable: false },
  { platform: 'linux', type: 0x6A656A63n, device: 41n, root: 41n, mount: { ...ext4, device: '0:44', filesystem: 'fakeowner' }, writable: false },
  { platform: 'linux', type: 0xEF53n, device: 2049n, root: 2050n, mount: ext4, writable: false },
  { platform: 'linux', type: 0xEF53n, device: 2049n, root: 2049n, mount: { ...ext4, device: '8:2' }, writable: false },
  { platform: 'linux', type: 0xEF53n, device: 2049n, root: 2049n, mount: undefined, writable: false },
  { platform: 'darwin', type: 0xEF53n, device: 2049n, root: 2049n, mount: ext4, writable: false },
])('synthetic filesystem policy case %# retains exact type/device/platform admission', ({ platform, type, device, root, mount, writable }) => {
  expect(writableFilesystem(platform, type, device, root, mount)).toBe(writable)
})

test.each([
  { type: 0xEF53n, filesystem: 'ext4', identity: 'stable' },
  { type: 0x794C7630n, filesystem: 'overlay', identity: 'stable' },
  { type: 0x65735546n, filesystem: 'virtiofs', identity: 'content' },
  { type: 0x65735546n, filesystem: 'fuse', identity: undefined },
  { type: 0x65735546n, filesystem: 'ext4', identity: undefined },
  { type: 0xEF53n, filesystem: 'virtiofs', identity: undefined },
])('admitted mount %# reports the identity model its storage supports', ({ type, filesystem, identity }) => {
  expect(admittedIdentity('linux', type, 70n, 70n, { ...ext4, device: '0:70', filesystem })).toBe(identity)
})

const held = { dev: 70n, ino: 5n, size: 12n, mtimeNs: 7n, ctimeNs: 9n }
test.each([
  { changed: {}, stable: true, content: true },
  { changed: { ino: 6n }, stable: false, content: true },
  { changed: { size: 13n }, stable: false, content: false },
  { changed: { mtimeNs: 8n }, stable: false, content: false },
  { changed: { ctimeNs: 10n }, stable: false, content: false },
  { changed: { dev: 71n }, stable: false, content: false },
  { changed: { ino: 6n, mtimeNs: 8n }, stable: false, content: false },
])('identity comparison case %# separates the inode from the rest of the metadata', ({ changed, stable, content }) => {
  expect(retained('stable', held, { ...held, ...changed })).toBe(stable)
  expect(retained('content', held, { ...held, ...changed })).toBe(content)
})

test.each([
  ['', ext4Record],
  ['mnt_id:\t27\nmnt_id:\t28', ext4Record],
  ['mnt_id:\t27 unexpected', ext4Record],
  ['mnt_id:\t0', ext4Record],
  ['mnt_id:\t28', ext4Record],
  ['mnt_id:\t27', `${ext4Record}\n${ext4Record}`],
  ['mnt_id:\t27', '27 1 8:1 / / rw'],
  ['mnt_id:\t27', ext4Record.replace('8:1', '8:invalid')],
  ['mnt_id:\t27', ext4Record.replace(' / / ', ' / relative ')],
  ['mnt_id:\t27', ext4Record.replace(' / / ', ' / /bad\\123 ')],
  ['mnt_id:\t27', ext4Record.replace(' /dev/root rw', '')],
])('synthetic missing or malformed mount metadata case %# is refused', (fdinfo, mountinfo) => {
  expect(() => mounts.descriptorMount(fdinfo!, mountinfo!)).toThrow()
})

test('synthetic descriptor association selects its own mount instead of another ext4 entry', () => {
  const mount = mounts.descriptorMount('mnt_id:\t32\n', `${ext4Record}\n32 1 0:26 / /dev/shm rw - tmpfs tmpfs rw`)
  expect(mount.filesystem).toBe('tmpfs')
  expect(writableFilesystem('linux', 0xEF53n, 2049n, 2049n, mount)).toBe(false)
  expect(mounts.mountDevice(2049n)).toBe('8:1')
  expect(mounts.mountDevice(70n)).toBe('0:70')
  expect(mounts.mountDevice(0x1200006734589n)).toBe('74565:26505')
  expect(mounts.mountDevice(-1n)).toBeUndefined()
  expect(mounts.mountDevice(1n << 64n)).toBeUndefined()
})

test('actual admitted storage preserves held directory and regular-file eligibility', async () => {
  const root = await createFixture('files-held-storage-')
  try {
    await writeFile(join(root, 'flow.mmd'), 'graph TD\nA-->B\n')
    for (const [path, flags] of [[root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW], [join(root, 'flow.mmd'), constants.O_RDONLY | constants.O_NOFOLLOW]] as const) {
      const handle = await open(path, flags)
      try {
        const metadata = await handle.stat({ bigint: true })
        const status = await inspectFilesystem(handle, metadata.dev, metadata.dev)
        expect(status).toMatchObject({ writable: true, filesystemType: process.env.MERDECK_TEST_EXPECTED_FS ?? '0x794c7630' })
        expect((await inspectFilesystem(handle, metadata.dev + 1n, metadata.dev + 1n)).writable).toBe(false)
        await expect(requireWritableFilesystem(handle, metadata.dev, metadata.dev + 1n)).rejects.toMatchObject({ code: 'filesystem_unsupported' })
      }
      finally { await handle.close() }
    }
    await expect(mounts.readDescriptorMount(-1)).rejects.toThrow('Invalid descriptor')
  }
  finally { await removeFixture(root) }
})

test.each(['missing', 'malformed'])('injected %s mount metadata refuses actual saves before temporary creation', async (mode) => {
  const root = await createFixture('files-mount-refusal-')
  let temporaryWrites = 0
  try {
    const original = 'graph TD\nKeep-->Bytes\n'
    await writeFile(join(root, 'flow.mmd'), original)
    const service = await createDiagramService({ projectRoot: root, limits: fixtureLimits }, { repositoryHooks: { writeTemporary: async () => {
      temporaryWrites++
    } } })
    const document = await service.readDocument('flow.mmd')
    const metadata = spyOn(mounts, 'readDescriptorMount').mockImplementation(async () => {
      if (mode === 'missing')
        throw new Error('Missing proc metadata')
      return mounts.descriptorMount('mnt_id:\t27', '27 malformed')
    })
    try {
      expect((await service.storageStatus()).writable).toBe(false)
      await expect(service.saveDiagram({ path: document.path, expectedVersion: document.version, selector: document.blocks[0]!.selector, source: 'replace' })).rejects.toMatchObject({ code: 'filesystem_unsupported' })
      expect(temporaryWrites).toBe(0)
      expect(await readdir(root)).toEqual(['flow.mmd'])
      expect(await readFile(join(root, 'flow.mmd'), 'utf8')).toBe(original)
    }
    finally { metadata.mockRestore() }
  }
  finally { await removeFixture(root) }
})
