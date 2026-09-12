import { gunzipSync, gzipSync } from 'node:zlib'

export const archiveName = 'merdeck.tar.gz'
export const bundleEntry = 'merdeck.js'
export const interfaceShell = 'web/index.html'
const block = 512
const fileMode = 0o644
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const octal = (value: number, length: number) => `${value.toString(8).padStart(length - 1, '0')}\0`
const entryPath = /^[\w.-]+(?:\/[\w.-]+)*$/

export interface ArchiveEntry {
  path: string
  bytes: Uint8Array
}

function header(path: string, size: number) {
  const bytes = new Uint8Array(block)
  const write = (offset: number, value: string) => bytes.set(encoder.encode(value), offset)
  write(0, path)
  write(100, octal(fileMode, 8))
  write(108, octal(0, 8))
  write(116, octal(0, 8))
  write(124, octal(size, 12))
  write(136, octal(0, 12))
  // The checksum is computed with its own field read as spaces.
  write(148, '        ')
  write(156, '0')
  write(257, 'ustar\0')
  write(263, '00')
  write(329, octal(0, 8))
  write(337, octal(0, 8))
  const checksum = bytes.reduce((total, value) => total + value, 0)
  write(148, `${checksum.toString(8).padStart(6, '0')}\0 `)
  return bytes
}

function ordinary(path: string) {
  return entryPath.test(path) && path.length <= 99 && !path.split('/').some(part => part === '.' || part === '..')
}

// Ordinary files in a reproducible archive: sorted names, fixed metadata and no stored name or timestamp.
export function filesArchive(entries: readonly ArchiveEntry[]) {
  if (entries.length === 0)
    throw new Error('A release archive holds at least one file')
  const sorted = [...entries].sort((first, second) => (first.path < second.path ? -1 : first.path > second.path ? 1 : 0))
  for (const [index, entry] of sorted.entries()) {
    if (!ordinary(entry.path))
      throw new Error('Archive entry names must be short and ordinary')
    if (index > 0 && sorted[index - 1]!.path === entry.path)
      throw new Error('Archive entry names must be unique')
  }
  const padded = (size: number) => Math.ceil(size / block) * block
  const content = sorted.reduce((total, entry) => total + block + padded(entry.bytes.byteLength), 0)
  const tar = new Uint8Array(content + block * 2)
  let offset = 0
  for (const entry of sorted) {
    tar.set(header(entry.path, entry.bytes.byteLength), offset)
    tar.set(entry.bytes, offset + block)
    offset += block + padded(entry.bytes.byteLength)
  }
  return new Uint8Array(gzipSync(tar, { level: 9 }))
}

export function archiveEntries(archive: Uint8Array): ArchiveEntry[] {
  const tar = new Uint8Array(gunzipSync(archive))
  if (tar.byteLength < block * 3 || tar.byteLength % block !== 0)
    throw new Error('A release archive holds files followed by its end blocks')
  const entries: ArchiveEntry[] = []
  let offset = 0
  while (offset + block * 2 <= tar.byteLength && tar.slice(offset, offset + block).some(value => value !== 0)) {
    const field = (start: number, length: number) => decoder.decode(tar.slice(offset + start, offset + start + length)).replace(/\0.*$/s, '').trim()
    const path = field(0, 100)
    const size = Number.parseInt(field(124, 12) || 'x', 8)
    if (!ordinary(path) || !Number.isSafeInteger(size) || size < 0 || field(156, 1) !== '0' || field(257, 6) !== 'ustar' || Number.parseInt(field(100, 8) || 'x', 8) !== fileMode)
      throw new Error('Release archive entries must be ordinary named files with fixed metadata')
    entries.push({ path, bytes: tar.slice(offset + block, offset + block + size) })
    offset += block + Math.ceil(size / block) * block
    if (entries.length > 4096)
      throw new Error('Release archive entry limit exceeded')
  }
  // Only the zero end blocks may follow the last entry, and the names must stay sorted and unique.
  if (entries.length === 0 || tar.byteLength - offset < block * 2 || tar.slice(offset).some(value => value !== 0))
    throw new Error('A release archive ends with its zero blocks and nothing else')
  if (entries.some((entry, index) => index > 0 && entries[index - 1]!.path >= entry.path))
    throw new Error('Release archive entries must be sorted and unique')
  return entries
}
