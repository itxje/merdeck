import { randomBytes } from 'node:crypto'
import { chmod, copyFile, cp, lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { basename, join } from 'node:path'
import { project, quote, requireSession, run, session, tmux } from './ci/process'
import { releaseArguments } from './release-version'
import { lazyBrowser } from './release/browser'
import { releaseFiles, sha256 } from './release/manifest'
import { auditTrace } from './release/trace'
import { health, identifyFixture, markerEvent, privateToken } from './test-support'

async function availableOrigin() {
  const socket = createServer()
  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject)
    socket.listen(0, '127.0.0.1', resolve)
  })
  const address = socket.address()
  if (!address || typeof address === 'string')
    throw new Error('Port allocation failed')
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
  return `http://127.0.0.1:${address.port}`
}

export async function smokeRelease(directory: string, tag: string) {
  requireSession()
  const { manifest } = await releaseFiles(directory, tag)
  if (process.platform !== 'linux' || manifest.target !== `bun-linux-${process.arch}`)
    throw new Error('This executable must be executed on its matching Linux architecture; cross-compilation is not smoke evidence')
  const parent = process.env.MERDECK_TEST_FIXTURE_PARENT
  const unsupported = process.env.MERDECK_TEST_UNSUPPORTED_PARENT
  const expected = process.env.MERDECK_TEST_EXPECTED_FS
  const refusal = process.env.MERDECK_TEST_UNSUPPORTED_FS
  if (!parent || !unsupported || !expected || !refusal)
    throw new Error('Explicit observed supported/refusal fixture parents and filesystem types are required')
  const positiveIdentity = await identifyFixture(parent, expected)
  const negativeIdentity = await identifyFixture(unsupported, refusal)
  const tracer = process.env.MERDECK_STRACE ?? Bun.which('strace')
  if (!tracer || !(await lstat(tracer)).isFile())
    throw new Error('Provide actual strace through MERDECK_STRACE or PATH for binary filesystem/process proof')
  const traceVersion = Bun.spawnSync([tracer, '--version'], { timeout: 5000 })
  if (traceVersion.exitCode !== 0)
    throw new Error('Unable to verify the actual tracer runtime')
  const tracerVersion = traceVersion.stdout.toString().split('\n')[0]
  const scratch = await mkdtemp('/tmp/merdeck-release-')
  const evidence = await mkdtemp(join(project, 'tmp/release-smoke-'))
  const runtime = join(scratch, 'runtime')
  await mkdir(runtime)
  const executable = join(runtime, manifest.filename)
  await copyFile(join(directory, manifest.filename), executable)
  await chmod(executable, 0o755)
  const tokenFile = join(scratch, 'token')
  await writeFile(tokenFile, randomBytes(32).toString('hex'), { mode: 0o600 })
  const roots: string[] = []
  const services: { role: string, id: string, marker: string, origin: string, root: string, trace: string }[] = []
  let failure: unknown
  let checkedAssets = 0
  let browser: Awaited<ReturnType<typeof lazyBrowser>> | undefined
  const traceResults: ReturnType<typeof auditTrace>[] = []
  async function start(root: string, role: string) {
    const origin = await availableOrigin()
    const marker = join(evidence, `${role}.ready`)
    const trace = join(evidence, `${role}.trace`)
    const config = join(scratch, `${role}.json`)
    await writeFile(config, JSON.stringify({ root, origin, tokenFile, marker, executable, directory: runtime, tracer, trace }), { mode: 0o600 })
    const ready = markerEvent(evidence, basename(marker), 20000)
    try {
      const command = `${quote(process.execPath)} ${quote(join(project, 'scripts/release/service.ts'))} ${quote(config)} > ${quote(join(evidence, `${role}.log`))} 2>&1`
      const id = tmux(['new-window', '-d', '-P', '-F', '#{window_id}', '-t', session, '-n', `binary-${role}`, '-c', project, 'bash', '-c', command])
      services.push({ role, id, marker, origin, root, trace })
      await ready.promise
      if (await readFile(marker, 'utf8') !== 'ready')
        throw new Error('Traced executable startup failed')
      await health(origin)
      process.stdout.write(`${JSON.stringify({ binaryOrigin: origin, reachability: 'loopback on this machine only', target: manifest.target })}\n`)
      return origin
    }
    finally { ready.cancel() }
  }
  try {
    const info = Bun.spawnSync([executable, '--build-info'], { cwd: runtime, env: { PATH: '' }, timeout: 10000 })
    if (info.exitCode || info.signalCode)
      throw new Error('Binary build-info execution failed')
    const actual: unknown = JSON.parse(info.stdout.toString())
    const { version, tag: buildTag, commit, target, prerelease, bun } = manifest
    if (JSON.stringify(actual) !== JSON.stringify({ tag: buildTag, version, prerelease, commit, target, bun, standalone: true }))
      throw new Error('Executable-reported build metadata mismatch')
    const versionOutput = Bun.spawnSync([executable, '--version'], { cwd: runtime, env: { PATH: '' }, timeout: 10000 })
    if (versionOutput.exitCode || versionOutput.stdout.toString() !== `Merdeck ${version}\n`)
      throw new Error('Executable-reported version mismatch')
    for (const [fixtureParent, role] of [[parent, 'supported'], [unsupported, 'unsupported']] as const) {
      const root = await mkdtemp(join(fixtureParent, `binary-${role}-`))
      roots.push(root)
      await cp(join(project, 'examples/project'), root, { recursive: true })
    }
    const origin = await start(roots[0]!, 'supported')
    const unsupportedOrigin = await start(roots[1]!, 'unsupported')
    for (const asset of manifest.assets) {
      const response = await fetch(`${origin}${asset.path}`, { signal: AbortSignal.timeout(10000) })
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (response.status !== 200 || response.headers.get('content-type') !== asset.contentType || bytes.byteLength !== asset.size || sha256(bytes) !== asset.sha256 || response.headers.get('x-content-type-options') !== 'nosniff' || !response.headers.get('content-security-policy')?.includes('script-src \'self\''))
        throw new Error(`Embedded asset HTTP mismatch: ${asset.path}`)
      checkedAssets++
    }
    for (const path of ['/api/diagrams/tree', '/api/diagrams/directory', '/api/diagrams/directory/revision', '/api/diagrams/document?path=welcome.mmd']) {
      if ((await fetch(`${origin}${path}`)).status !== 401)
        throw new Error('Binary authentication boundary failed')
    }
    for (const path of ['/api/missing', '/assets/missing.js', '/src/index.ts', '/.env']) {
      if ((await fetch(`${origin}${path}`)).status !== 404)
        throw new Error('Binary static/API containment boundary failed')
    }
    await run(['run', 'test:e2e'], 360000, { ...process.env, MERDECK_TEST_URL: origin, MERDECK_UNSUPPORTED_URL: unsupportedOrigin, MERDECK_SMOKE_ROOT: roots[0]!, MERDECK_SMOKE_TOKEN_FILE: tokenFile, MERDECK_TEST_DISPOSABLE: 'true' }, [await privateToken(tokenFile)])
    browser = await lazyBrowser(origin, tokenFile, join(evidence, 'lazy-diagrams.png'))
    if (JSON.stringify(await readdir(runtime)) !== JSON.stringify([manifest.filename]))
      throw new Error('Unexpected runtime directory extraction')
  }
  catch (error) { failure = error }
  const cleanup = async () => {
    let stopped = true
    for (const service of services.reverse()) {
      const event = markerEvent(evidence, `${basename(service.marker)}.stopped`, 15000)
      try {
        if (!await Bun.file(`${service.marker}.stopped`).exists()) {
          tmux(['send-keys', '-t', service.id, 'C-c'])
          await event.promise
        }
        if ((await readFile(`${service.marker}.stopped`, 'utf8')).trim() !== '0')
          throw new Error('Binary supervisor did not stop successfully')
        try {
          await fetch(`${service.origin}/api/health`, { signal: AbortSignal.timeout(2000) })
          throw new Error('Binary listener is still reachable')
        }
        catch (error) {
          if (error instanceof Error && error.message === 'Binary listener is still reachable')
            throw error
        }
      }
      catch (error) {
        failure ??= error
        stopped = false
      }
      finally { event.cancel() }
      try {
        traceResults.push(auditTrace(await readFile(service.trace, 'utf8'), executable, project, runtime, service.root))
      }
      catch (error) { failure ??= error }
    }
    let cleaned = stopped
    try {
      await rm(tokenFile, { force: true })
      for (const role of ['supported', 'unsupported'])
        await rm(join(scratch, `${role}.json`), { force: true })
      if (stopped) {
        for (const root of roots)
          await rm(root, { recursive: true, force: true })
        await rm(scratch, { recursive: true, force: true })
        for (const path of [...roots, scratch]) {
          const exists = await lstat(path).then(() => true, (error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT')
              return false
            throw error
          })
          if (exists)
            throw new Error('An owned release fixture survived cleanup')
        }
      }
    }
    catch (error) {
      failure ??= error
      cleaned = false
    }
    const result = { tracerVersion, target: manifest.target, host: process.arch, bun: manifest.bun, version: manifest.version, positiveIdentity, negativeIdentity, urls: services.map(item => item.origin), accessScope: 'loopback only; configured disposable sample roots', checkedAssets, assetCount: manifest.assets.length, browser, traceResults, cleanup: cleaned, result: failure ? 'failed' : 'passed', nativeAcceptance: expected === '0xef53' && !failure ? 'passed' : 'pending', evidence }
    await writeFile(join(evidence, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify(result)}\n`)
  }
  await cleanup()
  if (failure)
    throw failure
}
if (import.meta.main) {
  const args = releaseArguments(process.argv.slice(2))
  await smokeRelease(join(project, 'dist/release'), args.tag)
}
