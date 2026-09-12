import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { project } from '../../scripts/ci/process'
import { packageRelease } from '../../scripts/package-release'
import { binaryName } from '../../scripts/release-version'
import { archiveName, bundleEntry, filesArchive } from '../../scripts/release/archive'
import { sha256 } from '../../scripts/release/manifest'

export const fixtureTag = 'v0.0.0-ci.fixture'
export const fixtureCommit = 'a'.repeat(40)
export async function releaseFixture() {
  await mkdir(join(project, 'tmp'), { recursive: true })
  const directory = await mkdtemp(join(project, 'tmp/release-test-'))
  const filename = binaryName(fixtureTag, 'bun-linux-x64')
  // Minimal ELF bytes test package validation only; this is never execution evidence.
  const binary = new Uint8Array(64)
  binary.set([0x7F, 69, 76, 70, 2, 1])
  binary[18] = 62
  const assets = ['/index.html', '/favicon.svg', '/assets/app.js'].map(path => ({ path, contentType: 'text/plain', size: 1, sha256: sha256('x') }))
  const manifest = { schemaVersion: 1, tag: fixtureTag, version: fixtureTag.slice(1), prerelease: true, commit: fixtureCommit, target: 'bun-linux-x64', filename, bun: '1.4.2', assets }
  await writeFile(join(directory, filename), binary)
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest))
  await packageRelease(directory, fixtureTag)
  return { directory, filename, manifest }
}

export async function bundleFixture() {
  await mkdir(join(project, 'tmp'), { recursive: true })
  const directory = await mkdtemp(join(project, 'tmp/bundle-test-'))
  const encoder = new TextEncoder()
  const files = [
    { path: bundleEntry, bytes: encoder.encode('await startService()\n') },
    { path: 'web/index.html', bytes: encoder.encode('<!doctype html><html><head></head><body></body></html>') },
    { path: 'web/assets/app.js', bytes: encoder.encode('export {}') },
  ]
  const archive = filesArchive(files)
  const inventory = [...files]
    .sort((first, second) => (first.path < second.path ? -1 : 1))
    .map(file => ({ path: file.path, size: file.bytes.byteLength, sha256: sha256(file.bytes) }))
  const manifest = { schemaVersion: 1, version: fixtureTag.slice(1), tag: fixtureTag, prerelease: true, commit: fixtureCommit, runtime: 'bun', bun: '1.4.2', filename: archiveName, files: inventory }
  await writeFile(join(directory, archiveName), archive)
  await writeFile(join(directory, 'SHA256SUMS'), `${sha256(archive)}  ${archiveName}\n`)
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest))
  return { directory, files, manifest }
}
