import type { FileHandle } from 'node:fs/promises'
import type { DescriptorMount } from './mount'
import { constants } from 'node:fs'
import { open, statfs } from 'node:fs/promises'
import { AppError } from '../../shared/errors'
import { mountDevice, readDescriptorMount } from './mount'

export interface FileStorageStatus {
  writable: boolean
  filesystemType: string
  device: string
  supportedFilesystem: string
}

// A matching family is candidate admission; deployment acceptance remains a separate gate.
export function writableFilesystem(platform: string, type: bigint, device: bigint, rootDevice: bigint, mount: DescriptorMount | undefined): boolean {
  return platform === 'linux' && device === rootDevice && mount !== undefined && mount.device === mountDevice(device)
    && ((type === 0x794C7630n && mount.filesystem === 'overlay') || (type === 0xEF53n && mount.filesystem === 'ext4'))
}

async function inspectHandle(handle: FileHandle, device: bigint, rootDevice: bigint): Promise<FileStorageStatus> {
  const metadata = await handle.stat({ bigint: true })
  const filesystem = await statfs(`/proc/self/fd/${handle.fd}`, { bigint: true })
  // Missing, malformed or unassociated proc metadata cannot establish write eligibility.
  const mount = await readDescriptorMount(handle.fd).catch(() => undefined)
  return {
    writable: metadata.dev === device && (metadata.isDirectory() || metadata.isFile())
      && writableFilesystem(process.platform, filesystem.type, device, rootDevice, mount),
    filesystemType: `0x${filesystem.type.toString(16)}`,
    device: String(device),
    supportedFilesystem: 'linux-overlayfs,linux-ext4',
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

export async function requireWritableFilesystem(target: FileHandle | string, device: bigint, rootDevice: bigint): Promise<void> {
  if (!(await inspectFilesystem(target, device, rootDevice)).writable)
    throw new AppError('filesystem_unsupported')
}
