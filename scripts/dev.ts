import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const project = resolve(import.meta.dir, '..')
const role = process.argv[2]
if (role !== 'api' && role !== 'web')
  throw new Error('Expected api or web development role')
const suffix = createHash('md5').update(project).digest('hex').slice(0, 6)
const name = process.env.MERDECK_DEV_NAME ?? `merdeck-${suffix}`
if (!/^[a-z][a-z0-9-]{0,50}$/.test(name))
  throw new Error('MERDECK_DEV_NAME must be a short lowercase host label')
const nsl = resolve(project, 'node_modules/.bin/nsl')
const lookup = Bun.spawn([nsl, 'get', name], { stdout: 'pipe', stderr: 'inherit' })
const devOrigin = (await new Response(lookup.stdout).text()).trim()
if (await lookup.exited !== 0 || !/^https?:\/\//.test(devOrigin))
  throw new Error('Unable to discover the development origin from nsl')
const command = role === 'api'
  ? [nsl, 'run', '-n', `${name}:/api`, '-s', '--', process.execPath, '--watch', 'src/index.ts']
  : [nsl, 'run', '-n', name, '--', 'vite', '--host', '127.0.0.1', '--port', 'NSL_PORT']
const child = Bun.spawn(command, {
  cwd: role === 'api' ? project : resolve(project, 'web'),
  env: {
    ...process.env,
    NODE_ENV: 'development',
    MERDECK_API_MODE: 'stripped',
    MERDECK_ALLOWED_ORIGINS: process.env.MERDECK_ALLOWED_ORIGINS || devOrigin,
  },
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})
const stop = () => child.kill('SIGTERM')
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
process.exitCode = await child.exited
