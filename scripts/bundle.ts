import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { snapshotBuildAssets } from '../src/shared/application-build'
import { loadStaticAssets } from '../src/shared/static-assets'
import { project, requireSession, run } from './ci/process'
import { commitSchema, releaseVersion } from './release-version'
import { archiveName, bundleEntry, filesArchive } from './release/archive'
import { sha256 } from './release/manifest'

// The published artifact runs on any architecture: bundled JavaScript plus the built interface, started by the host's Bun.
export async function bundleRelease(tag: string, options: { built?: boolean, output?: string } = {}) {
  requireSession()
  const info = releaseVersion(tag)
  const revision = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], { cwd: project })
  if (revision.exitCode !== 0)
    throw new Error('Unable to identify build commit')
  const commit = commitSchema.parse(revision.stdout.toString().trim())
  const output = options.output ?? join(project, 'dist/bundle')
  await mkdir(join(project, 'tmp'), { recursive: true })
  await mkdir(output, { recursive: true })
  // Do not overwrite a prior artifact: a failed rerun must retain reviewable evidence.
  if (await Bun.file(join(output, archiveName)).exists() || await Bun.file(join(output, 'manifest.json')).exists())
    throw new Error('Bundle output already exists; use an empty output directory')
  const scratch = await mkdtemp(join(project, 'tmp/bundle-'))
  try {
    if (!options.built)
      await run(['run', 'build'])
    const buildInfo = { version: info.version, prerelease: info.prerelease, tag: info.tag, commit, target: 'bundle' }
    const entry = join(scratch, bundleEntry.replace(/\.js$/, '.ts'))
    await writeFile(entry, `import { dirname, resolve } from 'node:path';\nimport { startService } from ${JSON.stringify(join(project, 'src/index.ts'))};\nimport { loadStaticAssets } from ${JSON.stringify(join(project, 'src/shared/static-assets.ts'))};\nconst directory = dirname(resolve(process.argv[1] ?? ${JSON.stringify(bundleEntry)}));\nawait startService({ assets: await loadStaticAssets(resolve(directory, 'web')), buildInfo: ${JSON.stringify(buildInfo)} });\n`)
    const built = await Bun.build({ entrypoints: [entry], outdir: join(scratch, 'out'), target: 'bun', minify: true })
    if (!built.success)
      throw new Error('Bundle build failed')
    // Snapshot the already validated interface bytes, never later unchecked paths in the build tree.
    const { assets } = snapshotBuildAssets(await loadStaticAssets(join(project, 'web/dist')))
    const files = [
      { path: bundleEntry, bytes: new Uint8Array(await readFile(join(scratch, 'out', bundleEntry))) },
      ...[...assets].map(([path, asset]) => ({ path: `web${path}`, bytes: asset.body })),
    ]
    const archive = filesArchive(files)
    const inventory = [...files]
      .sort((first, second) => (first.path < second.path ? -1 : first.path > second.path ? 1 : 0))
      .map(file => ({ path: file.path, size: file.bytes.byteLength, sha256: sha256(file.bytes) }))
    await writeFile(join(scratch, archiveName), archive)
    await writeFile(join(scratch, 'SHA256SUMS'), `${sha256(archive)}  ${archiveName}\n`)
    await writeFile(join(scratch, 'manifest.json'), `${JSON.stringify({ schemaVersion: 1, version: info.version, tag: info.tag, prerelease: info.prerelease, commit, runtime: 'bun', bun: Bun.version, filename: archiveName, files: inventory }, null, 2)}\n`)
    for (const name of [archiveName, 'SHA256SUMS', 'manifest.json'])
      await rename(join(scratch, name), join(output, name))
    return { directory: output, files: inventory.length, bytes: archive.byteLength }
  }
  finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  const values = process.argv.slice(2)
  if (values.length !== 2 || values[0] !== '--tag' || !values[1])
    throw new Error('Usage: --tag vMAJOR.MINOR.PATCH[-prerelease]')
  const result = await bundleRelease(releaseVersion(values[1]).tag)
  process.stdout.write(`${JSON.stringify({ artifact: archiveName, ...result, runtime: 'bun on any Linux architecture' })}\n`)
}
