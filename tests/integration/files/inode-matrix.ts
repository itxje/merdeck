import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// A finite experiment, not a reliability gate. Never retry failed iterations.
function run() {
  const mode = process.argv[2]
  if (!['service-isolated', 'raw-bun', 'raw-node', 'raw-bun-boundaries'].includes(mode ?? ''))
    throw new Error('Choose service-isolated, raw-bun, raw-node, or raw-bun-boundaries')
  const runtime = mode === 'raw-node' ? 'node' : resolve('.cache/runtime/node_modules/.bin/bun')
  const count = 20
  const timeoutMs = 10000
  mkdirSync(resolve('tmp'), { recursive: true })
  const directory = mkdtempSync(resolve(`tmp/inode-${mode}-`))
  const results: object[] = []
  let failures = 0
  for (let iteration = 1; iteration <= count; iteration++) {
    const trace = resolve(directory, `${iteration}.json`)
    const args = mode === 'service-isolated'
      ? ['test', '--preload', './tests/integration/files/inode-preload.ts', '--test-name-pattern=^ordinary README contexts', './tests/integration/files/acceptance.test.ts']
      : ['tests/integration/files/inode-raw.ts']
    if (mode === 'raw-bun-boundaries')
      args.push('--boundary-snapshots')
    const child = spawnSync(runtime, args, {
      encoding: 'utf8',
      timeout: timeoutMs,
      killSignal: 'SIGKILL',
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, MERDECK_INODE_TRACE: trace },
    })
    writeFileSync(resolve(directory, `${iteration}.stdout`), child.stdout ?? '')
    writeFileSync(resolve(directory, `${iteration}.stderr`), child.stderr ?? '')
    const result = { iteration, pid: child.pid, status: child.status, signal: child.signal, error: child.error?.message ?? null }
    results.push(result)
    if (child.status !== 0)
      failures++
    process.stdout.write(`${JSON.stringify(result)}\n`)
  }
  const summary = { mode, runtime, args: mode === 'service-isolated' ? 'unchanged README acceptance test with metadata preload' : 'identical raw filesystem probe', count, failures, successes: count - failures, timeoutMs, results }
  writeFileSync(resolve(directory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify({ evidence: directory, ...summary })}\n`)
  process.exitCode = failures ? 1 : 0
}

run()
