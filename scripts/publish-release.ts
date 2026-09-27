import type { Transport } from './release/publisher'
import { join } from 'node:path'
import { project } from './ci/process'
import { commitSchema, releaseVersion } from './release-version'
import { publishRelease } from './release/publisher'

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_EVENT_NAME !== 'push' || process.env.GITHUB_REF_TYPE !== 'tag' || process.env.GITHUB_REPOSITORY !== 'itxje/merdeck')
  throw new Error('Publication is only permitted in the authorized repository tag workflow')
const token = process.env.GITHUB_TOKEN
if (!token)
  throw new Error('The publishing job requires its standard GITHUB_TOKEN')
const tag = releaseVersion(process.env.GITHUB_REF_NAME ?? '').tag
const commit = commitSchema.parse(process.env.GITHUB_SHA)
const transport: Transport = async (path, method = 'GET', data) => {
  if (!path.startsWith('/') || path.includes('..'))
    throw new Error('Invalid release API path')
  const upload = method === 'UPLOAD'
  if (upload && !/^\/releases\/\d+\/assets\?name=[\w.%+-]+$/.test(path))
    throw new Error('Invalid release upload path')
  const url = `${upload ? 'https://uploads.github.com' : 'https://api.github.com'}/repos/itxje/merdeck${path}`
  const response = await fetch(url, {
    method: upload ? 'POST' : method,
    headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2026-03-10', 'Content-Type': upload ? 'application/octet-stream' : 'application/json' },
    ...(data === undefined ? {} : { body: upload ? data as Uint8Array : JSON.stringify(data) }),
    redirect: 'error',
    signal: AbortSignal.timeout(120000),
  })
  if (!response.ok)
    throw new Error(`Release API failed: ${method} HTTP ${response.status}`)
  return response.json()
}
const result = await publishRelease(join(project, 'dist/bundle'), tag, commit, transport)
process.stdout.write(`${JSON.stringify(result)}\n`)
