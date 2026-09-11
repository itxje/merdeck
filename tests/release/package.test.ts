import { readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { packageRelease } from '../../scripts/package-release'
import { releaseFiles } from '../../scripts/release/manifest'
import { fixtureCommit, fixtureTag, releaseFixture } from './fixtures'

test('package checks assert tag, commit, checksum, exact inventory and ELF architecture', async () => {
  const { directory, filename } = await releaseFixture()
  try {
    expect((await releaseFiles(directory, fixtureTag, fixtureCommit)).assets.map(item => item.name)).toEqual([filename, 'SHA256SUMS'])
    await expect(releaseFiles(directory, 'v0.0.0-other')).rejects.toThrow('mismatch')
    await expect(releaseFiles(directory, fixtureTag, 'b'.repeat(40))).rejects.toThrow('mismatch')
    await writeFile(join(directory, '.env'), 'synthetic')
    await expect(releaseFiles(directory, fixtureTag)).rejects.toThrow('entries')
    await rm(join(directory, '.env'))
    const original = await readFile(join(directory, 'SHA256SUMS'))
    await writeFile(join(directory, 'SHA256SUMS'), 'incorrect')
    await expect(releaseFiles(directory, fixtureTag)).rejects.toThrow('checksum')
    await writeFile(join(directory, 'SHA256SUMS'), original)
    const wrongArchitecture = await readFile(join(directory, filename))
    wrongArchitecture[18] = 183
    await writeFile(join(directory, filename), wrongArchitecture)
    await expect(packageRelease(directory, fixtureTag)).rejects.toThrow('architecture')
    await rm(join(directory, filename))
    await symlink(join(directory, 'manifest.json'), join(directory, filename))
    await expect(releaseFiles(directory, fixtureTag)).rejects.toThrow('regular')
  }
  finally { await rm(directory, { recursive: true, force: true }) }
})
