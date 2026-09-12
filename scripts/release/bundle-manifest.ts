import { lstat, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { commitSchema, releaseVersion } from '../release-version'
import { archiveEntries, archiveName, bundleEntry, interfaceShell } from './archive'
import { sha256 } from './manifest'

const digest = z.string().regex(/^[a-f0-9]{64}$/)
export const bundleManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  version: z.string(),
  tag: z.string(),
  prerelease: z.boolean(),
  commit: commitSchema,
  runtime: z.literal('bun'),
  bun: z.literal('1.4.2'),
  filename: z.literal(archiveName),
  files: z.array(z.strictObject({ path: z.string().regex(/^(?:merdeck\.js|web\/(?:index\.html|favicon\.svg|assets\/[\w.-]+))$/), size: z.number().int().positive(), sha256: digest })).min(2).max(4096),
})
export type BundleManifest = z.infer<typeof bundleManifestSchema>

export async function readBundleManifest(directory: string, tag: string, commit?: string) {
  const metadata = await lstat(join(directory, 'manifest.json'))
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 4 * 1024 * 1024)
    throw new Error('Bundle manifest must be a bounded regular file')
  const manifest = bundleManifestSchema.parse(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')))
  const version = releaseVersion(tag)
  if (manifest.tag !== tag || manifest.version !== version.version || manifest.prerelease !== version.prerelease || (commit && manifest.commit !== commit))
    throw new Error('Bundle tag/version/commit mismatch')
  const paths = manifest.files.map(file => file.path)
  if (new Set(paths).size !== paths.length || !paths.includes(bundleEntry) || !paths.includes(interfaceShell))
    throw new Error('Invalid bundle file inventory')
  return manifest
}

export async function bundleFiles(directory: string, tag: string, commit?: string) {
  const manifest = await readBundleManifest(directory, tag, commit)
  const expected = [archiveName, 'SHA256SUMS', 'manifest.json'].sort()
  if (JSON.stringify((await readdir(directory)).sort()) !== JSON.stringify(expected))
    throw new Error('Unexpected or missing bundle package entries')
  for (const name of expected) {
    const stat = await lstat(join(directory, name))
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512 * 1024 * 1024)
      throw new Error('Bundle entries must be regular files')
  }
  const archive = new Uint8Array(await readFile(join(directory, archiveName)))
  const checksum = `${sha256(archive)}  ${archiveName}\n`
  if (await readFile(join(directory, 'SHA256SUMS'), 'utf8') !== checksum)
    throw new Error('Bundle checksum mismatch')
  // The published archive must hold exactly the files this manifest records.
  const inventory = archiveEntries(archive).map(entry => ({ path: entry.path, size: entry.bytes.byteLength, sha256: sha256(entry.bytes) }))
  const recorded = [...manifest.files].sort((first, second) => (first.path < second.path ? -1 : first.path > second.path ? 1 : 0))
  if (JSON.stringify(inventory) !== JSON.stringify(recorded))
    throw new Error('Bundle archive contents do not match the manifest inventory')
  return { manifest, assets: [{ name: archiveName, bytes: archive }, { name: 'SHA256SUMS', bytes: new TextEncoder().encode(checksum) }] }
}
