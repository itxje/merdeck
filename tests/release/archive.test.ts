import { gunzipSync, gzipSync } from 'node:zlib'
import { expect, test } from 'bun:test'
import { archiveEntries, bundleEntry, filesArchive } from '../../scripts/release/archive'

const hex = (value: Uint8Array) => [...value].map(item => item.toString(16).padStart(2, '0')).join('')
const text = (value: string) => new TextEncoder().encode(value)
const files = [
  { path: bundleEntry, bytes: new Uint8Array(1000).map((_, index) => index % 251) },
  { path: 'web/index.html', bytes: text('<!doctype html>') },
  { path: 'web/assets/app.js', bytes: text('export {}') },
]
const sorted = [...files].sort((first, second) => (first.path < second.path ? -1 : 1))

test('the release archive is reproducible, sorted and read back exactly', () => {
  const archive = filesArchive(files)
  // Entry order, stored names and timestamps must not change identical builds.
  expect(hex(archive)).toBe(hex(filesArchive([...files].reverse())))
  expect([...archive.slice(0, 8)]).toEqual([0x1F, 0x8B, 0x08, 0, 0, 0, 0, 0])
  const tar = gunzipSync(archive)
  expect(tar.byteLength % 512).toBe(0)
  expect(new TextDecoder().decode(tar.subarray(257, 262))).toBe('ustar')
  const entries = archiveEntries(archive)
  expect(entries.map(entry => entry.path)).toEqual(sorted.map(file => file.path))
  expect(entries.map(entry => hex(entry.bytes))).toEqual(sorted.map(file => hex(file.bytes)))
})

test('archive names and contents beyond ordinary sorted files are refused', () => {
  expect(() => filesArchive([])).toThrow('at least one file')
  expect(() => filesArchive([{ path: '../escape', bytes: text('x') }])).toThrow('ordinary')
  expect(() => filesArchive([{ path: 'web/../x', bytes: text('x') }])).toThrow('ordinary')
  expect(() => filesArchive([{ path: 'a'.repeat(120), bytes: text('x') }])).toThrow('ordinary')
  expect(() => filesArchive([{ path: 'same', bytes: text('x') }, { path: 'same', bytes: text('y') }])).toThrow('unique')
  const tar = new Uint8Array(gunzipSync(filesArchive(files)))
  expect(() => archiveEntries(new Uint8Array(gzipSync(tar.subarray(0, 512))))).toThrow('end blocks')
  const trailing = new Uint8Array(tar)
  trailing.fill(1, tar.byteLength - 512)
  expect(() => archiveEntries(new Uint8Array(gzipSync(trailing)))).toThrow('zero blocks')
  const directoryEntry = new Uint8Array(tar)
  directoryEntry.set(text('5'), 156)
  expect(() => archiveEntries(new Uint8Array(gzipSync(directoryEntry)))).toThrow('ordinary named files')
  const mode = new Uint8Array(tar)
  mode.set(text('0000777\0'), 100)
  expect(() => archiveEntries(new Uint8Array(gzipSync(mode)))).toThrow('fixed metadata')
})
