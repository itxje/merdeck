import { createHash } from 'node:crypto'
import { chmod, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { project } from './ci/process'
import { actionlint } from './ci/tools'

if (process.platform !== 'linux' || !['arm64', 'x64'].includes(process.arch))
  throw new Error('CI tooling is currently verified for Linux arm64/x64 only')
const selected = actionlint.archives[process.arch as keyof typeof actionlint.archives]
const destination = join(project, '.cache/actionlint', actionlint.version)
await mkdir(join(project, '.cache/actionlint'), { recursive: true })
const scratch = await mkdtemp(join(project, '.cache/actionlint/install-'))
try {
  const name = `actionlint_${actionlint.version}_linux_${selected.arch}.tar.gz`
  const response = await fetch(`https://github.com/rhysd/actionlint/releases/download/v${actionlint.version}/${name}`, { signal: AbortSignal.timeout(60000) })
  if (!response.ok)
    throw new Error(`Official actionlint download failed: ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (createHash('sha256').update(bytes).digest('hex') !== selected.sha256)
    throw new Error('Actionlint archive integrity mismatch')
  const archive = join(scratch, name)
  await writeFile(archive, bytes)
  const result = Bun.spawnSync(['tar', 'xzf', archive, '-C', scratch, 'actionlint'], { timeout: 10000 })
  if (result.exitCode !== 0)
    throw new Error('Actionlint extraction failed')
  const binary = join(scratch, 'actionlint')
  await chmod(binary, 0o755)
  const version = Bun.spawnSync([binary, '-version'], { timeout: 5000 })
  if (version.exitCode !== 0 || !version.stdout.toString().startsWith(actionlint.version))
    throw new Error('Actionlint runtime version mismatch')
  await mkdir(destination, { recursive: true })
  await rename(binary, join(destination, 'actionlint'))
  process.stdout.write(`Verified actionlint ${actionlint.version}, archive SHA-256 ${selected.sha256}\n`)
}
finally { await rm(scratch, { recursive: true, force: true }) }
