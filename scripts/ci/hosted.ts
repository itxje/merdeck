import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { storageIdentity } from '../storage-support'
import { markerEvent } from '../test-support'
import { project, quote, session, tmux } from './process'

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_OS !== 'Linux' || process.arch !== 'x64')
  throw new Error('Hosted verification requires an actual Linux x64 GitHub Actions runner')
const runnerTemp = process.env.RUNNER_TEMP
if (!runnerTemp)
  throw new Error('Runner temporary directory is missing')
await mkdir(join(project, 'tmp'), { recursive: true })
const evidence = await mkdtemp(join(project, 'tmp/hosted-'))
const parent = await mkdtemp(join(resolve(runnerTemp), 'merdeck-native-'))
const unsupported = await mkdtemp('/dev/shm/merdeck-refusal-')
const marker = join(evidence, 'completed')
const privateConfig = join(evidence, 'private-config.json')
let exit = 1
try {
  const native = await storageIdentity(parent)
  const refusal = await storageIdentity(unsupported)
  const commit = Bun.spawnSync(['git', 'rev-parse', 'HEAD']).stdout.toString().trim()
  const dirty = Bun.spawnSync(['git', 'status', '--porcelain']).stdout.toString().trim() !== ''
  const provenance = { commit, dirty, run: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`, attempt: process.env.GITHUB_RUN_ATTEMPT, runner: { name: process.env.RUNNER_NAME, os: process.env.RUNNER_OS, architecture: process.env.RUNNER_ARCH, image: process.env.ImageOS, version: process.env.ImageVersion }, native, refusal, bun: Bun.version, node: Bun.spawnSync(['node', '--version']).stdout.toString().trim() }
  await writeFile(join(evidence, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`)
  if (dirty)
    throw new Error('Hosted verification requires a clean candidate commit')
  const environment: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    PLAYWRIGHT_BROWSERS_PATH: join(project, '.cache/playwright'),
    MERDECK_NATIVE_PARENT: parent,
    MERDECK_TEST_FIXTURE_PARENT: parent,
    MERDECK_TEST_EXPECTED_FS: '0xef53',
    MERDECK_TEST_UNSUPPORTED_PARENT: unsupported,
    MERDECK_TEST_UNSUPPORTED_FS: refusal.filesystemType,
    MERDECK_STRACE: Bun.which('strace') ?? '',
  }
  if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_EVENT_NAME === 'push')
    environment.MERDECK_RELEASE_TAG = process.env.GITHUB_REF_NAME ?? ''
  await writeFile(privateConfig, JSON.stringify({ environment, marker }), { mode: 0o600 })
  const exists = Bun.spawnSync(['tmux', 'has-session', '-t', session])
  if (exists.exitCode !== 0)
    tmux(['new-session', '-d', '-s', session, '-c', project, '/bin/bash'])
  const completed = markerEvent(evidence, 'completed', 1500000)
  try {
    tmux(['send-keys', '-t', session, `${quote(process.execPath)} ${quote(join(project, 'scripts/ci/job.ts'))} ${quote(privateConfig)} > ${quote(join(evidence, 'checks.log'))} 2>&1`, 'Enter'])
    await completed.promise
    exit = Number(await readFile(marker, 'utf8'))
    process.stdout.write(await readFile(join(evidence, 'checks.log'), 'utf8'))
  }
  finally { completed.cancel() }
}
catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Hosted verification failed'}\n`)
}
finally {
  await rm(privateConfig, { force: true })
  // A failed service cleanup retains its owned roots for diagnosis; never delete active inputs.
  for (const root of [parent, unsupported]) {
    if ((await readdir(root)).length === 0)
      await rm(root, { recursive: true })
    else exit = 1
  }
  await writeFile(join(evidence, 'exit.json'), JSON.stringify({ exit, nativeAcceptance: exit === 0 ? 'passed' : 'pending' }))
}
process.exitCode = exit
