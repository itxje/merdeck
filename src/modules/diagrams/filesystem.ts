import type { FileHandle } from 'node:fs/promises'
import type { DescriptorMount } from './mount'
import { constants } from 'node:fs'
import { open, statfs } from 'node:fs/promises'
import { AppError } from '../../shared/errors'
import { mountDevice, readDescriptorMount } from './mount'

// How a mount answers "is this still the same file": by its inode, or by the bytes it holds.
export type StorageIdentity = 'stable' | 'content'

// The metadata both models compare; `BigIntStats` satisfies it structurally.
export interface FileIdentity {
  dev: bigint
  ino: bigint
  size: bigint
  mtimeNs: bigint
  ctimeNs: bigint
}

// Storage that renumbers a replaced file cannot answer "still the same file" with an inode. There the
// complete-file hash the protocol already compares answers it, which gives up exactly one distinction:
// an external replacement whose bytes and both timestamps are identical no longer conflicts.
export function retained(identity: StorageIdentity, a: FileIdentity, b: FileIdentity): boolean {
  return a.dev === b.dev && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs
    && (identity === 'content' || a.ino === b.ino)
}

export interface FileStorageStatus {
  writable: boolean
  identity: StorageIdentity | 'none'
  filesystemType: string
  device: string
  supportedFilesystem: string
}

// A family is admitted with the identity model it actually supports, measured through the held mount.
const admitted: { type: bigint, filesystem: string, identity: StorageIdentity }[] = [
  { type: 0x794C7630n, filesystem: 'overlay', identity: 'stable' },
  { type: 0xEF53n, filesystem: 'ext4', identity: 'stable' },
  { type: 0x65735546n, filesystem: 'virtiofs', identity: 'content' },
]

// A matching family is candidate admission; deployment acceptance remains a separate gate.
export function admittedIdentity(platform: string, type: bigint, device: bigint, rootDevice: bigint, mount: DescriptorMount | undefined): StorageIdentity | undefined {
  if (platform !== 'linux' || device !== rootDevice || mount === undefined || mount.device !== mountDevice(device))
    return undefined
  return admitted.find(entry => entry.type === type && entry.filesystem === mount.filesystem)?.identity
}

export function writableFilesystem(platform: string, type: bigint, device: bigint, rootDevice: bigint, mount: DescriptorMount | undefined): boolean {
  return admittedIdentity(platform, type, device, rootDevice, mount) !== undefined
}

async function inspectHandle(handle: FileHandle, device: bigint, rootDevice: bigint): Promise<FileStorageStatus> {
  const metadata = await handle.stat({ bigint: true })
  const filesystem = await statfs(`/proc/self/fd/${handle.fd}`, { bigint: true })
  // Missing, malformed or unassociated proc metadata cannot establish write eligibility.
  const mount = await readDescriptorMount(handle.fd).catch(() => undefined)
  const identity = metadata.dev === device && (metadata.isDirectory() || metadata.isFile())
    ? admittedIdentity(process.platform, filesystem.type, device, rootDevice, mount)
    : undefined
  return {
    writable: identity !== undefined,
    identity: identity ?? 'none',
    filesystemType: `0x${filesystem.type.toString(16)}`,
    device: String(device),
    supportedFilesystem: 'linux-overlayfs,linux-ext4,linux-virtiofs',
  }
}

export async function inspectFilesystem(target: FileHandle | string, device: bigint, rootDevice: bigint): Promise<FileStorageStatus> {
  if (typeof target !== 'string')
    return inspectHandle(target, device, rootDevice)
  const handle = await open(target, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
  try {
    return await inspectHandle(handle, device, rootDevice)
  }
  finally { await handle.close() }
}

export async function requireWritableFilesystem(target: FileHandle | string, device: bigint, rootDevice: bigint): Promise<StorageIdentity> {
  const status = await inspectFilesystem(target, device, rootDevice)
  if (status.identity === 'none')
    throw new AppError('filesystem_unsupported')
  return status.identity
}
