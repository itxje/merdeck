import { gunzipSync, gzipSync } from 'node:zlib'

export const archiveName = 'merdeck.tar.gz'
export const archiveEntryName = 'merdeck'
const block = 512
const entryMode = 0o755
const encoder = new TextEncoder()
const octal = (value: number, length: number) => `${value.toString(8).padStart(length - 1, '0')}\0`

function header(name: string, size: number) {
  const bytes = new Uint8Array(block)
  const write = (offset: number, value: string) => bytes.set(encoder.encode(value), offset)
  write(0, name)
  write(100, octal(entryMode, 8))
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

// One ordinary file in a reproducible archive: fixed metadata and no stored name or timestamp.
export function singleFileArchive(bytes: Uint8Array, name = archiveEntryName) {
  if (!/^[\w.-]{1,99}$/.test(name))
    throw new Error('Archive entry names must be short and ordinary')
  const padded = Math.ceil(bytes.byteLength / block) * block
  const tar = new Uint8Array(block + padded + block * 2)
  tar.set(header(name, bytes.byteLength), 0)
  tar.set(bytes, block)
  return new Uint8Array(gzipSync(tar, { level: 9 }))
}

export function singleFileArchiveEntry(archive: Uint8Array) {
  const tar = new Uint8Array(gunzipSync(archive))
  if (tar.byteLength < block * 3 || tar.byteLength % block !== 0)
    throw new Error('Release archive must hold one file and its end blocks')
  const text = (offset: number, length: number) => new TextDecoder().decode(tar.slice(offset, offset + length)).replace(/\0.*$/s, '').trim()
  const size = Number.parseInt(text(124, 12) || 'x', 8)
  const name = text(0, 100)
  if (!Number.isSafeInteger(size) || size < 0 || text(156, 1) !== '0' || text(257, 6) !== 'ustar' || !/^[\w.-]{1,99}$/.test(name))
    throw new Error('Release archive entry must be one ordinary named file')
  const padded = Math.ceil(size / block) * block
  if (tar.byteLength !== block + padded + block * 2 || tar.slice(block + size).some(value => value !== 0))
    throw new Error('Release archive must contain exactly one file')
  return { name, mode: Number.parseInt(text(100, 8) || 'x', 8), bytes: tar.slice(block, block + size) }
}
