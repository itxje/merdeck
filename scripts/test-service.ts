import { writeFileSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { health, privateToken } from './test-support'

const configuration = z.object({
  root: z.string(),
  origin: z.string(),
  // Absent for a service with open access.
  tokenFile: z.string().optional(),
  marker: z.string(),
})
const config = configuration.parse(JSON.parse(await readFile(process.argv[2]!, 'utf8')))
process.on('exit', () => writeFileSync(`${config.marker}.stopped`, String(process.exitCode ?? 0)))
try {
  Object.assign(process.env, {
    MERDECK_ROOT: config.root,
    MERDECK_TOKEN: config.tokenFile ? await privateToken(config.tokenFile) : '',
    MERDECK_HOST: '127.0.0.1',
    PORT: new URL(config.origin).port,
    MERDECK_ALLOWED_ORIGINS: config.origin,
    MERDECK_API_MODE: 'prefixed',
    MERDECK_COOKIE_SECURE: 'auto',
    MERDECK_MAX_FILE_BYTES: '8192',
    MERDECK_MAX_TREE_ENTRIES: '100',
    MERDECK_POLL_INTERVAL_MS: '1000',
    NODE_ENV: 'production',
  })
  await import(pathToFileURL(resolve('dist/index.js')).href)
  if (process.exitCode)
    throw new Error('Built service failed during startup')
  await health(config.origin)
  await writeFile(`${config.marker}.pending`, 'ready', { mode: 0o600 })
  await rename(`${config.marker}.pending`, config.marker)
}
catch {
  await writeFile(`${config.marker}.pending`, 'failed', { mode: 0o600 })
  await rename(`${config.marker}.pending`, config.marker)
  process.stderr.write('Acceptance service startup failed.\n')
  process.exit(1)
}
