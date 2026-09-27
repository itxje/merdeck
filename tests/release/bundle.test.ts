import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { archiveName, filesArchive } from '../../scripts/release/archive'
import { bundleFiles } from '../../scripts/release/bundle-manifest'
import { sha256 } from '../../scripts/release/manifest'
import { bundleFixture, fixtureCommit, fixtureTag } from './fixtures'

test('bundle checks assert tag, commit, exact entries, checksum and archive contents', async () => {
  const { directory, files } = await bundleFixture()
  try {
    expect((await bundleFiles(directory, fixtureTag, fixtureCommit)).assets.map(asset => asset.name)).toEqual([archiveName, 'SHA256SUMS'])
    await expect(bundleFiles(directory, 'v0.0.0-other')).rejects.toThrow('mismatch')
    await expect(bundleFiles(directory, fixtureTag, 'b'.repeat(40))).rejects.toThrow('mismatch')
    await writeFile(join(directory, '.env'), 'synthetic')
    await expect(bundleFiles(directory, fixtureTag)).rejects.toThrow('entries')
    await rm(join(directory, '.env'))
    const checksums = await readFile(join(directory, 'SHA256SUMS'))
    await writeFile(join(directory, 'SHA256SUMS'), 'incorrect')
    await expect(bundleFiles(directory, fixtureTag)).rejects.toThrow('checksum')
    await writeFile(join(directory, 'SHA256SUMS'), checksums)
    // An archive that carries more than the manifest records is refused, even with a matching checksum.
    const extra = filesArchive([...files, { path: 'web/assets/extra.js', bytes: new TextEncoder().encode('export {}') }])
    await writeFile(join(directory, archiveName), extra)
    await writeFile(join(directory, 'SHA256SUMS'), `${sha256(extra)}  ${archiveName}\n`)
    await expect(bundleFiles(directory, fixtureTag)).rejects.toThrow('inventory')
  }
  finally { await rm(directory, { recursive: true, force: true }) }
})

test('a bundle inventory without its entry or its interface is refused', async () => {
  const { directory, manifest } = await bundleFixture()
  try {
    for (const path of ['merdeck.js', 'web/index.html']) {
      await writeFile(join(directory, 'manifest.json'), JSON.stringify({ ...manifest, files: manifest.files.filter(file => file.path !== path) }))
      await expect(bundleFiles(directory, fixtureTag)).rejects.toThrow('inventory')
    }
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ ...manifest, files: [...manifest.files, { path: 'web/../escape.js', size: 1, sha256: sha256('x') }] }))
    await expect(bundleFiles(directory, fixtureTag)).rejects.toThrow()
  }
  finally { await rm(directory, { recursive: true, force: true }) }
})
