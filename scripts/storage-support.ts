import { constants } from 'node:fs'
import { lstat, open, realpath, statfs } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { mountDevice, readDescriptorMount } from '../src/modules/diagrams/mount'

export { descriptorMount } from '../src/modules/diagrams/mount'

export function nativeArguments(args: string[]) {
  const values = args[0] === '--' ? args.slice(1) : args
  if (values.length !== 3 || !values[0] || values[1] !== '--filesystem' || values[2] !== 'ext4')
    throw new Error('Usage: bun run check:storage -- /canonical/fixture/parent --filesystem ext4')
  return { parent: values[0], filesystem: 'ext4', magic: '0xef53' } as const
}

export async function storageIdentity(path: string) {
  if (process.platform !== 'linux' || !isAbsolute(path) || resolve(path) !== path || await realpath(path) !== path)
    throw new Error('An existing canonical absolute Linux fixture parent is required')
  const handle = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
  try {
    const metadata = await handle.stat({ bigint: true })
    const current = await lstat(path, { bigint: true })
    const anchor = `/proc/self/fd/${handle.fd}`
    if (!metadata.isDirectory() || metadata.dev !== current.dev || metadata.ino !== current.ino || await realpath(anchor) !== path)
      throw new Error('Fixture parent identity changed')
    const filesystem = await statfs(anchor, { bigint: true })
    const mount = await readDescriptorMount(handle.fd)
    return { root: path, filesystemType: `0x${filesystem.type.toString(16)}`, device: String(metadata.dev), mount }
  }
  finally { await handle.close() }
}

export function requireNative(identity: Awaited<ReturnType<typeof storageIdentity>>, expected: ReturnType<typeof nativeArguments>) {
  if (identity.filesystemType !== expected.magic || identity.mount.filesystem !== expected.filesystem || identity.mount.device !== mountDevice(BigInt(identity.device)))
    throw new Error(`Native target mismatch: expected ${expected.filesystem}/${expected.magic}; observed ${identity.mount.filesystem}/${identity.filesystemType}`)
}
