import { gunzipSync, gzipSync } from 'node:zlib'
import { expect, test } from 'bun:test'
import { archiveEntryName, singleFileArchive, singleFileArchiveEntry } from '../../scripts/release/archive'

const bytes = new Uint8Array(1000).map((_, index) => index % 251)
const hex = (value: Uint8Array) => [...value].map(item => item.toString(16).padStart(2, '0')).join('')
const raw = (archive: Uint8Array) => new Uint8Array(gunzipSync(archive))
const packed = (tar: Uint8Array) => new Uint8Array(gzipSync(tar))

test('the release archive is reproducible and holds exactly one ordinary executable', () => {
  const archive = singleFileArchive(bytes)
  expect(hex(archive)).toBe(hex(singleFileArchive(bytes)))
  // A stored name or timestamp would make identical builds produce different archives.
  expect([...archive.slice(0, 8)]).toEqual([0x1F, 0x8B, 0x08, 0, 0, 0, 0, 0])
  const tar = raw(archive)
  expect(tar.byteLength % 512).toBe(0)
  expect(new TextDecoder().decode(tar.subarray(257, 262))).toBe('ustar')
  const entry = singleFileArchiveEntry(archive)
  expect(entry.name).toBe(archiveEntryName)
  expect(entry.mode).toBe(0o755)
  expect(hex(entry.bytes)).toBe(hex(bytes))
})

test('archive entry names and contents beyond one file are refused', () => {
  expect(() => singleFileArchive(bytes, '../escape')).toThrow('ordinary')
  expect(() => singleFileArchive(bytes, '')).toThrow('ordinary')
  const tar = raw(singleFileArchive(bytes))
  expect(() => singleFileArchiveEntry(packed(tar.subarray(0, 512)))).toThrow('end blocks')
  const appended = new Uint8Array(tar)
  appended.fill(1, tar.byteLength - 512)
  expect(() => singleFileArchiveEntry(packed(appended))).toThrow('exactly one file')
  const renamed = new Uint8Array(tar)
  renamed.set(new TextEncoder().encode('data\0'), 0)
  expect(singleFileArchiveEntry(packed(renamed)).name).toBe('data')
  const directory = new Uint8Array(tar)
  directory.set(new TextEncoder().encode('5'), 156)
  expect(() => singleFileArchiveEntry(packed(directory))).toThrow('ordinary named file')
})
