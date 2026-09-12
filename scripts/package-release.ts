import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { project } from './ci/process'
import { releaseArguments } from './release-version'
import { readManifest, releaseFiles, sha256 } from './release/manifest'

export async function packageRelease(directory: string, tag: string) {
  const manifest = await readManifest(directory, tag)
  const digest = sha256(await readFile(join(directory, manifest.filename)))
  await writeFile(join(directory, 'SHA256SUMS'), `${digest}  ${manifest.filename}\n`)
  await releaseFiles(directory, tag)
  process.stdout.write(`${JSON.stringify({ artifact: manifest.filename, sha256: digest, assets: manifest.assets.length, format: 'checked executable; the published artifact is the architecture-independent bundle' })}\n`)
}
if (import.meta.main) {
  const args = releaseArguments(process.argv.slice(2))
  const directory = join(project, 'dist/release')
  if ((await readManifest(directory, args.tag)).target !== args.target)
    throw new Error('Target mismatch')
  await packageRelease(directory, args.tag)
}
