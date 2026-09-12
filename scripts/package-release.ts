import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { project } from './ci/process'
import { releaseArguments } from './release-version'
import { archiveName, singleFileArchive } from './release/archive'
import { readManifest, releaseFiles, sha256 } from './release/manifest'

export async function packageRelease(directory: string, tag: string) {
  const manifest = await readManifest(directory, tag)
  // The published attachment keeps one stable name; the checked executable stays beside it.
  const archive = singleFileArchive(new Uint8Array(await readFile(join(directory, manifest.filename))))
  await writeFile(join(directory, archiveName), archive)
  const digest = sha256(archive)
  await writeFile(join(directory, 'SHA256SUMS'), `${digest}  ${archiveName}\n`)
  await releaseFiles(directory, tag)
  process.stdout.write(`${JSON.stringify({ artifact: archiveName, sha256: digest, size: archive.byteLength, executable: manifest.filename, embeddedAssets: manifest.assets.length, format: 'gzip-compressed tar holding one standalone executable' })}\n`)
}
if (import.meta.main) {
  const args = releaseArguments(process.argv.slice(2))
  const directory = join(project, 'dist/release')
  if ((await readManifest(directory, args.tag)).target !== args.target)
    throw new Error('Target mismatch')
  await packageRelease(directory, args.tag)
}
