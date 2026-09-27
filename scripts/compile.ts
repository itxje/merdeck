import type { ReleaseTarget } from './release-version'
import { chmod, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { project, requireSession, run } from './ci/process'
import { embedAssets } from './embed-assets'
import { binaryName, commitSchema, releaseArguments, releaseVersion } from './release-version'

export async function compile(tag: string, target: ReleaseTarget, options: { built?: boolean, output?: string, signal?: AbortSignal, failBuild?: boolean } = {}) {
  requireSession()
  releaseVersion(tag)
  const revision = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], { cwd: project })
  if (revision.exitCode !== 0)
    throw new Error('Unable to identify build commit')
  const commit = commitSchema.parse(revision.stdout.toString().trim())
  const output = options.output ?? join(project, 'dist/release')
  await mkdir(join(project, 'tmp'), { recursive: true })
  await mkdir(output, { recursive: true })
  const scratch = await mkdtemp(join(project, 'tmp/compile-'))
  const staged = join(scratch, 'executable')
  const filename = binaryName(tag, target)
  const info = { ...releaseVersion(tag), commit, target }
  let published = false
  try {
    options.signal?.throwIfAborted()
    if (!options.built)
      await run(['run', '--cwd', 'web', 'build'])
    const inventory = await embedAssets(join(project, 'web/dist'), scratch)
    const entry = join(scratch, 'entry.ts')
    await writeFile(entry, `import { startService } from ${JSON.stringify(join(project, 'src/service.ts'))};\nimport { assets } from './assets';\nawait startService({ assets, buildInfo: ${JSON.stringify(info)} });\n${options.failBuild ? 'import "./intentional-missing-build-input";' : ''}\n`)
    options.signal?.throwIfAborted()
    const child = Bun.spawn([process.execPath, 'build', '--compile', `--target=${target}`, '--minify', '--no-compile-autoload-dotenv', '--no-compile-autoload-bunfig', entry, '--outfile', staged], { cwd: project, stdout: 'inherit', stderr: 'inherit', timeout: 180000 })
    const cancel = () => child.kill('SIGTERM')
    options.signal?.addEventListener('abort', cancel, { once: true })
    let exit: number
    try {
      exit = await child.exited
    }
    finally { options.signal?.removeEventListener('abort', cancel) }
    options.signal?.throwIfAborted()
    if (exit !== 0 || child.signalCode)
      throw new Error('Executable compilation failed')
    await chmod(staged, 0o755)
    options.signal?.throwIfAborted()
    // Do not overwrite a prior artifact: a failed rerun must retain reviewable evidence.
    if (await Bun.file(join(output, filename)).exists() || await Bun.file(join(output, 'manifest.json')).exists())
      throw new Error('Release output already exists; use an empty output directory')
    await writeFile(join(scratch, 'manifest.json'), `${JSON.stringify({ schemaVersion: 1, ...info, filename, bun: Bun.version, assets: inventory }, null, 2)}\n`)
    await rename(staged, join(output, filename))
    published = true
    options.signal?.throwIfAborted()
    await rename(join(scratch, 'manifest.json'), join(output, 'manifest.json'))
    options.signal?.throwIfAborted()
    return { directory: output, filename, inventory }
  }
  catch (error) {
    if (published) {
      await rm(join(output, filename), { force: true })
      await rm(join(output, 'manifest.json'), { force: true })
    }
    throw error
  }
  finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  const args = releaseArguments(process.argv.slice(2))
  const controller = new AbortController()
  const stop = () => controller.abort(new Error('Compilation interrupted'))
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  try {
    await compile(args.tag, args.target, { signal: controller.signal })
  }
  finally {
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
  }
}
