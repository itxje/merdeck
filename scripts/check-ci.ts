import { mkdir, mkdtemp, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { project, requireSession, run } from './ci/process'
import { compile } from './compile'
import { packageRelease } from './package-release'
import { releaseVersion } from './release-version'
import { smokeRelease } from './smoke-release'

requireSession()
if (Bun.spawnSync(['node', '--version']).stdout.toString().trim() !== 'v24.20.0')
  throw new Error('check:ci requires the repository Node 24.20.0 pin')
const native = process.argv.slice(2).includes('--native')
if (process.argv.slice(2).some(value => value !== '--native'))
  throw new Error('Usage: bun run check:ci [--native]')
const tag = process.env.MERDECK_RELEASE_TAG ?? 'v0.0.0-ci.fixture'
releaseVersion(tag)
if (!native && tag !== 'v0.0.0-ci.fixture')
  throw new Error('Real tag verification requires --native; local checks use the nonpublishing fixture only')
const target = process.arch === 'arm64' ? 'bun-linux-arm64' : 'bun-linux-x64'
if (process.platform !== 'linux' || !['arm64', 'x64'].includes(process.arch))
  throw new Error('Only matching Linux execution targets are supported by this check')
await run(['run', 'lint:workflows'])
if (native) {
  const parent = process.env.MERDECK_NATIVE_PARENT
  if (!parent || process.arch !== 'x64')
    throw new Error('Native delivery verification requires the actual explicit native parent and Linux x64 runner')
  // This includes file and focused HTTP gates after the raw/admission stage; do not repeat them.
  await run(['run', 'check:storage', '--', parent, '--filesystem', 'ext4'])
  await run(['node_modules/typescript/bin/tsc', '--project', 'tests/integration/storage/tsconfig.json'])
  await run(['test', './tests/integration/storage/runner.test.ts'])
}
else {
  await run(['run', 'check:files'])
  await run(['node_modules/typescript/bin/tsc', '--project', 'tests/integration/storage/tsconfig.json'])
  await run(['test', './tests/integration/storage'])
  process.stdout.write('Local storage checks do not establish native acceptance. Native gate: pending.\n')
}
await run(['run', 'check'])
await run(['run', 'test:release'])
await mkdir(join(project, 'tmp'), { recursive: true })
const output = await mkdtemp(join(project, 'tmp/checked-release-'))
await compile(tag, target, { built: true, output })
await packageRelease(output, tag)
await smokeRelease(output, tag)
// Keep prior complete outputs as evidence. Never reuse unchecked files in publication.
const destination = join(project, 'dist/release')
if (await Bun.file(join(destination, 'manifest.json')).exists())
  await rename(destination, `${await mkdtemp(join(project, 'tmp/prior-release-'))}/release`)
await rename(output, destination)
process.stdout.write(`check:ci passed for ${target}; native acceptance: ${native ? 'passed' : 'pending'}; remote CI/release: unobserved locally.\n`)
