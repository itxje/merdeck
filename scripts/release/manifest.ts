import { createHash } from 'node:crypto'
import { lstat, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { binaryName, commitSchema, releaseVersion, targetSchema } from '../release-version'
import { archiveEntryName, archiveName, singleFileArchiveEntry } from './archive'

export const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex')
const digest = z.string().regex(/^[a-f0-9]{64}$/)
export const manifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  version: z.string(),
  tag: z.string(),
  prerelease: z.boolean(),
  commit: commitSchema,
  target: targetSchema,
  filename: z.string(),
  bun: z.literal('1.4.2'),
  assets: z.array(z.strictObject({ path: z.string().regex(/^\/(?:index\.html|favicon\.svg|assets\/[\w./-]+)$/), contentType: z.string(), size: z.number().int().positive(), sha256: digest })).min(2).max(4096),
})
export type ReleaseManifest = z.infer<typeof manifestSchema>

export async function readManifest(directory: string, tag: string, commit?: string) {
  const metadata = await lstat(join(directory, 'manifest.json'))
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 4 * 1024 * 1024)
    throw new Error('Release manifest must be a bounded regular file')
  const manifest = manifestSchema.parse(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')))
  const version = releaseVersion(tag)
  if (manifest.tag !== tag || manifest.version !== version.version || manifest.prerelease !== version.prerelease || manifest.filename !== binaryName(tag, manifest.target) || (commit && manifest.commit !== commit))
    throw new Error('Release tag/version/filename/commit mismatch')
  if (!manifest.assets.some(asset => asset.path === '/index.html') || new Set(manifest.assets.map(asset => asset.path)).size !== manifest.assets.length || manifest.assets.some(asset => asset.path.split('/').some(part => part.startsWith('.'))))
    throw new Error('Invalid embedded asset inventory')
  return manifest
}

export async function releaseFiles(directory: string, tag: string, commit?: string) {
  const manifest = await readManifest(directory, tag, commit)
  const expected = [manifest.filename, archiveName, 'SHA256SUMS', 'manifest.json'].sort()
  if (JSON.stringify((await readdir(directory)).sort()) !== JSON.stringify(expected))
    throw new Error('Unexpected or missing release package entries')
  for (const name of expected) {
    const stat = await lstat(join(directory, name))
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512 * 1024 * 1024)
      throw new Error('Release entries must be regular files')
  }
  const binary = new Uint8Array(await readFile(join(directory, manifest.filename)))
  const archive = new Uint8Array(await readFile(join(directory, archiveName)))
  const checksum = `${sha256(archive)}  ${archiveName}\n`
  if (await readFile(join(directory, 'SHA256SUMS'), 'utf8') !== checksum)
    throw new Error('Release checksum mismatch')
  // The published archive must hold exactly the executable these checks accept.
  const entry = singleFileArchiveEntry(archive)
  if (entry.name !== archiveEntryName || entry.mode !== 0o755 || sha256(entry.bytes) !== sha256(binary))
    throw new Error('Release archive does not hold the checked executable')
  // Linux ELF class and machine must agree even when cross-compilation cannot be executed.
  if (binary[0] !== 0x7F || String.fromCharCode(...binary.slice(1, 4)) !== 'ELF' || binary[4] !== 2 || binary[5] !== 1 || new DataView(binary.buffer).getUint16(18, true) !== (manifest.target === 'bun-linux-x64' ? 62 : 183))
    throw new Error('Executable architecture/header mismatch')
  return { manifest, assets: [{ name: archiveName, bytes: archive }, { name: 'SHA256SUMS', bytes: new TextEncoder().encode(checksum) }] }
}
