import { mkdir, mkdtemp, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { bundleRelease } from './bundle'
import { checkArtifacts } from './ci/artifact-checks'
import { ciOptions } from './ci/mode'
import { project, requireSession, run } from './ci/process'
import { compile } from './compile'
import { packageRelease } from './package-release'
import { releaseVersion } from './release-version'
import { smokeBundle } from './smoke-bundle'
import { smokeRelease } from './smoke-release'

requireSession()
if (!/^v24\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(Bun.spawnSync(['node', '--version']).stdout.toString().trim()))
  throw new Error('check:ci requires a stable Node 24 release')
const tag = process.env.MERDECK_RELEASE_TAG ?? 'v0.0.0-ci.fixture'
releaseVersion(tag)
const { native, sourceOnly } = ciOptions(process.argv.slice(2), tag)
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
await run(['scripts/check-directory-streaming.ts'])
await run(['run', 'test:release'])
if (!sourceOnly) {
  await mkdir(join(project, 'tmp'), { recursive: true })
  const output = await mkdtemp(join(project, 'tmp/checked-release-'))
  await compile(tag, target, { built: true, output })
  await packageRelease(output, tag)
  const bundleOutput = await mkdtemp(join(project, 'tmp/checked-bundle-'))
  await bundleRelease(tag, { built: true, output: bundleOutput })
  await checkArtifacts(() => smokeRelease(output, tag), () => smokeBundle(bundleOutput, tag))
  // Wait for both checks and their cleanup before exposing either artifact to publication.
  const destination = join(project, 'dist/release')
  if (await Bun.file(join(destination, 'manifest.json')).exists())
    await rename(destination, `${await mkdtemp(join(project, 'tmp/prior-release-'))}/release`)
  await rename(output, destination)
  const bundleDestination = join(project, 'dist/bundle')
  if (await Bun.file(join(bundleDestination, 'manifest.json')).exists())
    await rename(bundleDestination, `${await mkdtemp(join(project, 'tmp/prior-bundle-'))}/bundle`)
  await rename(bundleOutput, bundleDestination)
}
await run(['scripts/ci/evidence.ts'])
process.stdout.write(sourceOnly
  ? 'Source verification passed; native artifact acceptance: pending; no release artifacts produced.\n'
  : `check:ci passed for ${target} with the architecture-independent bundle; native acceptance: ${native ? 'passed' : 'pending'}; remote CI/release: unobserved locally.\n`)
