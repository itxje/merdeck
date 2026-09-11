import { watch, writeFileSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { health, privateToken } from '../test-support'

const schema = z.strictObject({ root: z.string(), origin: z.string(), tokenFile: z.string(), marker: z.string(), executable: z.string(), directory: z.string(), tracer: z.string(), trace: z.string() })
const config = schema.parse(JSON.parse(await readFile(process.argv[2]!, 'utf8')))
process.on('exit', () => writeFileSync(`${config.marker}.stopped`, String(process.exitCode ?? 0)))
await writeFile(config.trace, '')
const token = await privateToken(config.tokenFile)
let child: ReturnType<typeof Bun.spawn> | undefined
function stop() {
  child?.kill('SIGINT')
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
try {
  let observed = false
  let watcher: ReturnType<typeof watch> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let exited = false
  const ready = new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      watcher?.close()
      clearTimeout(timer)
      if (error)
        reject(error)
      else resolve()
    }
    watcher = watch(config.trace, () => {
      void readFile(config.trace, 'utf8').then((trace) => {
        if (!observed && /\blisten\([^\n]*\)\s+=\s+0/.test(trace)) {
          observed = true
          void health(config.origin).then(() => finish(), () => finish(new Error('Binary health contract failed')))
        }
      }, () => finish(new Error('Trace read failed')))
    })
    watcher.on('error', () => finish(new Error('Trace observation failed')))
    timer = setTimeout(() => finish(new Error('Binary startup trace timed out')), 15000)
    child = Bun.spawn([config.tracer, '-f', '-yy', '-s', '256', '-e', 'trace=%file,%process,listen', '-o', config.trace, config.executable], {
      cwd: config.directory,
      env: {
        PATH: '',
        TZ: 'UTC',
        LANG: 'C',
        NODE_ENV: 'production',
        MERDECK_ROOT: config.root,
        MERDECK_TOKEN: token,
        MERDECK_HOST: '127.0.0.1',
        PORT: new URL(config.origin).port,
        MERDECK_ALLOWED_ORIGINS: config.origin,
        MERDECK_API_MODE: 'prefixed',
        MERDECK_COOKIE_SECURE: 'auto',
        MERDECK_MAX_FILE_BYTES: '8192',
        MERDECK_MAX_TREE_ENTRIES: '100',
        MERDECK_POLL_INTERVAL_MS: '1000',
      },
      stdout: 'inherit',
      stderr: 'inherit',
    })
    void child.exited.then(() => {
      exited = true
      if (!observed)
        finish(new Error('Binary or tracer exited before listening'))
    })
  })
  await ready
  await writeFile(`${config.marker}.pending`, 'ready', { mode: 0o600 })
  await rename(`${config.marker}.pending`, config.marker)
  if (exited || !child)
    throw new Error('Binary exited during startup')
  const exit = await child.exited
  process.exitCode = exit
}
catch {
  child?.kill('SIGTERM')
  if (child)
    await child.exited
  await writeFile(`${config.marker}.pending`, 'failed', { mode: 0o600 })
  await rename(`${config.marker}.pending`, config.marker)
  process.stderr.write('Traced executable service failed. Inspect the private local trace.\n')
  process.exitCode = 1
}
finally {
  process.removeListener('SIGINT', stop)
  process.removeListener('SIGTERM', stop)
}
