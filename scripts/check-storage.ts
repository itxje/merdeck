import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { z } from 'zod'
import { inspectFilesystem } from '../src/modules/diagrams/filesystem'
import { nativeArguments, requireNative, storageIdentity } from './storage-support'

const project = resolve(import.meta.dir, '..')
const rawResult = z.object({ succeeded: z.literal(true), filesystemType: z.literal('0xef53'), temporaryEntriesRemaining: z.literal(0), fixtureRemoved: z.literal(true), events: z.array(z.unknown()).min(1) })
const session = `${basename(project).replaceAll('.', '-')}-${createHash('md5').update(project).digest('hex').slice(0, 6)}`

async function main() {
  const expected = nativeArguments(process.argv.slice(2))
  if (Bun.version !== '1.4.2' || process.cwd() !== project || !process.env.TMUX)
    throw new Error('Run from the project root inside its tmux session using Bun 1.4.2')
  const tmux = Bun.spawnSync(['tmux', 'display-message', '-p', '#S'], { timeout: 5000 })
  if (tmux.exitCode !== 0 || tmux.stdout.toString().trim() !== session)
    throw new Error(`Use the project tmux session: ${session}`)
  await mkdir(join(project, 'tmp'), { recursive: true })
  const evidence = await mkdtemp(join(project, 'tmp/storage-check-'))
  const stages: { name: string, exit: number, signal: string | null }[] = []
  const observations: Awaited<ReturnType<typeof storageIdentity>>[] = []
  let fixture: string | undefined
  let cleanup = false
  let sourceChecks = false
  let failure: string | null = null
  const git = (args: string[]) => {
    const result = Bun.spawnSync(['git', ...args], { cwd: project, timeout: 5000 })
    if (result.exitCode !== 0)
      throw new Error('Unable to identify candidate commit')
    return result.stdout.toString().trim()
  }
  const provenance = { commit: git(['rev-parse', 'HEAD']), dirty: git(['status', '--porcelain']).length > 0, bun: Bun.version, nodeCompatibility: process.versions.node, platform: process.platform, architecture: process.arch }
  async function command(name: string, args: string[], cwd = project, environment: NodeJS.ProcessEnv = process.env) {
    const child = Bun.spawn([process.execPath, ...args], { cwd, env: environment, stdout: Bun.file(join(evidence, `${name}.stdout`)), stderr: Bun.file(join(evidence, `${name}.stderr`)), timeout: name.startsWith('raw-') ? 10000 : 120000 })
    const exit = await child.exited
    const result = { name, exit, signal: child.signalCode ?? null }
    stages.push(result)
    await writeFile(join(evidence, `${name}.exit.json`), JSON.stringify(result))
    process.stdout.write(`${JSON.stringify(result)}\n`)
    return exit === 0 && !child.signalCode
  }
  try {
    const identity = await storageIdentity(expected.parent)
    observations.push(identity)
    process.stdout.write(`${JSON.stringify({ target: identity, expected, provenance })}\n`)
    requireNative(identity, expected)
    const unsupportedParent = process.env.MERDECK_TEST_UNSUPPORTED_PARENT
    const unsupportedType = process.env.MERDECK_TEST_UNSUPPORTED_FS
    if (!unsupportedParent || !unsupportedType)
      throw new Error('Explicit MERDECK_TEST_UNSUPPORTED_PARENT and MERDECK_TEST_UNSUPPORTED_FS are required')
    const unsupported = await storageIdentity(unsupportedParent)
    observations.push(unsupported)
    const refusal = await inspectFilesystem(unsupportedParent, BigInt(unsupported.device), BigInt(unsupported.device))
    if (unsupported.filesystemType !== unsupportedType || refusal.writable || unsupportedType === expected.magic)
      throw new Error('The separate refusal fixture must match an actual unsupported filesystem')
    fixture = await mkdtemp(join(expected.parent, 'storage-native-'))
    const observedFixture = await storageIdentity(fixture)
    observations.push(observedFixture)
    requireNative(observedFixture, expected)
    if (observedFixture.device !== identity.device || observedFixture.mount.id !== identity.mount.id)
      throw new Error('The owned fixture moved to a different mount')
    await mkdir(join(fixture, 'tmp'))
    let rawFailures = 0
    for (let iteration = 1; iteration <= 20; iteration++) {
      const name = `raw-${iteration}`
      const trace = join(fixture, 'tmp', `${name}.json`)
      const passed = await command(name, [join(project, 'tests/integration/files/inode-raw.ts')], fixture, { ...process.env, MERDECK_INODE_TRACE: trace })
      try {
        await copyFile(trace, join(evidence, `${name}.json`))
        const valid = rawResult.safeParse(JSON.parse(await readFile(trace, 'utf8'))).success
        if (!passed || !valid)
          rawFailures++
      }
      catch { rawFailures++ }
    }
    if (rawFailures)
      throw new Error(`Native raw identity control failed in ${rawFailures}/20 children; inspect retained traces`)
    const admission = await inspectFilesystem(fixture, BigInt(observedFixture.device), BigInt(observedFixture.device))
    await writeFile(join(evidence, 'admission.json'), JSON.stringify(admission))
    if (!admission.writable)
      throw new Error('Raw evidence collected; production policy does not admit this native filesystem. A reviewed evidence-based policy correction is still required')
    const environment = { ...process.env, MERDECK_TEST_FIXTURE_PARENT: fixture, MERDECK_TEST_EXPECTED_FS: expected.magic }
    if (!await command('files', ['run', 'check:files'], project, environment))
      throw new Error('Native file protocol checks failed')
    if (!await command('http', ['test', './tests/integration/storage/http.test.ts'], project, environment))
      throw new Error('Native HTTP capability checks failed')
    // These fixed suites must execute assertions; command completion alone is insufficient.
    for (const name of ['files', 'http']) {
      const output = await readFile(join(evidence, `${name}.stderr`), 'utf8')
      if (!/[1-9]\d* pass/.test(output) || !/\b0 fail\b/.test(output) || /\b[1-9]\d* (?:skip|todo)\b/.test(output))
        throw new Error(`Missing complete test evidence for ${name}`)
    }
    sourceChecks = true
  }
  catch (error) {
    failure = error instanceof Error ? error.message : 'Storage verification failed'
  }
  finally {
    try {
      if (fixture) {
        await rm(fixture, { recursive: true, force: true })
        cleanup = !(await readdir(expected.parent)).includes(basename(fixture))
      }
      else { cleanup = true }
    }
    catch { cleanup = false }
    if (!cleanup)
      failure = `${failure ?? ''}; fixture cleanup failed`
    const result = { schemaVersion: 1, expected, provenance, observations, stages, nativeSourceChecks: sourceChecks && cleanup ? 'passed' : 'failed', nativeAcceptance: 'pending', deployedBinary: 'pending', browser: 'pending', historicalDiagnostic: { applicationSafetyPassed: false }, cleanup, failure, evidence }
    await writeFile(join(evidence, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = sourceChecks && cleanup ? 0 : 1
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Storage verification failed'}\n`)
  process.exitCode = 1
})
