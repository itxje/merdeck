import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createApp } from './app'
import { ConfigError, loadConfig } from './config'
import { createDiagramService } from './modules/diagrams'
import { AppError } from './shared/errors'

let project: string
const testToken = 'test-only-token-with-at-least-32-characters'
async function appFor(environment: Record<string, string>) {
  const config = await loadConfig(environment)
  return createApp(config, { diagrams: await createDiagramService(config) })
}
const env = () => ({ MERDECK_ROOT: project, MERDECK_TOKEN: testToken })

beforeAll(async () => {
  await mkdir('tmp', { recursive: true })
  project = await mkdtemp(resolve('tmp/config-'))
  await writeFile(`${project}/file.mmd`, 'graph TD\nA-->B\n')
})
afterAll(async () => {
  await rm(project, { recursive: true, force: true })
})

describe('startup configuration', () => {
  test('requires an explicit absolute root and a valid token when one is set', async () => {
    for (const value of [{}, { ...env(), MERDECK_ROOT: '.' }, { ...env(), MERDECK_TOKEN: 'short' }])
      await expect(loadConfig(value)).rejects.toBeInstanceOf(ConfigError)
  })
  test('runs without a token only on loopback unless open access is acknowledged', async () => {
    const root = { MERDECK_ROOT: project }
    for (const value of [{}, { MERDECK_TOKEN: '' }, { MERDECK_HOST: '::1' }, { MERDECK_HOST: 'localhost' }, { MERDECK_HOST: '127.0.0.2' }, { MERDECK_ALLOWED_ORIGINS: 'http://localhost:8787,http://[::1]:8787,http://127.0.0.1:9000' }])
      expect((await loadConfig({ ...root, ...value })).token).toBeUndefined()
    for (const value of [{ MERDECK_HOST: '0.0.0.0' }, { MERDECK_HOST: '192.0.2.10' }, { MERDECK_HOST: 'merdeck.example.test' }, { MERDECK_ALLOWED_ORIGINS: 'https://merdeck.example.test' }, { MERDECK_ALLOWED_ORIGINS: 'http://127.0.0.1:8787,http://192.0.2.10:8787' }])
      await expect(loadConfig({ ...root, ...value })).rejects.toThrow('A service reachable beyond loopback requires MERDECK_TOKEN or MERDECK_OPEN_ACCESS=true')
    expect((await loadConfig({ ...root, MERDECK_HOST: '0.0.0.0', MERDECK_ALLOWED_ORIGINS: 'https://merdeck.example.test', MERDECK_OPEN_ACCESS: 'true' })).token).toBeUndefined()
    expect((await loadConfig({ ...env(), MERDECK_HOST: '0.0.0.0' })).token).toBe(testToken)
    await expect(loadConfig({ ...env(), MERDECK_OPEN_ACCESS: 'true' })).rejects.toThrow('MERDECK_OPEN_ACCESS cannot be combined with MERDECK_TOKEN')
  })
  test('rejects missing roots and regular files without leaking paths', async () => {
    for (const path of [`${project}/missing`, `${project}/file.mmd`])
      await expect(loadConfig({ ...env(), MERDECK_ROOT: path })).rejects.toThrow('MERDECK_ROOT must be an accessible directory')
  })
  test('validates limits, origins, binding and secret syntax', async () => {
    for (const value of [
      { PORT: '0' },
      { PORT: '65536' },
      { PORT: '' },
      { MERDECK_HOST: 'host/path' },
      { MERDECK_HOST: '[]' },
      { MERDECK_HOST: '-bad.test' },
      { MERDECK_MAX_FILE_BYTES: '0' },
      { MERDECK_MAX_TREE_ENTRIES: '10001' },
      { MERDECK_MAX_TREE_DEPTH: '33' },
      { MERDECK_MAX_BLOCKS: '0' },
      { MERDECK_POLL_INTERVAL_MS: '1' },
      { MERDECK_SESSION_TTL_SECONDS: '999999' },
      { MERDECK_MAX_SESSIONS: '0' },
      { MERDECK_ALLOWED_ORIGINS: 'https://user:password@example.test' },
      { MERDECK_ALLOWED_ORIGINS: 'https://example.test/path' },
      { MERDECK_ALLOWED_ORIGINS: '*' },
      { MERDECK_TOKEN: `${testToken}\n` },
      { MERDECK_OPEN_ACCESS: 'yes' },
      { MERDECK_OPEN_ACCESS: '' },
      { MERDECK_COOKIE_SECURE: 'false' },
      { MERDECK_COOKIE_SECURE: 'true' },
      { MERDECK_ALLOWED_ORIGINS: 'https://example.test,http://example.test' },
      { MERDECK_ALLOWED_ORIGINS: 'https://example.test,http://other.test' },
    ])
      await expect(loadConfig({ ...env(), ...value })).rejects.toBeInstanceOf(ConfigError)
  })
  test('uses bounded defaults and immutable config', async () => {
    const config = await loadConfig(env())
    expect(config.projectRoot).toBe(project)
    expect(config.host).toBe('127.0.0.1')
    expect(config.port).toBe(8787)
    expect(config.apiBasePath).toBe('/api')
    expect(config.allowedOrigins).toEqual(['http://127.0.0.1:8787'])
    expect(config.limits.pollIntervalMs).toBe(3000)
    expect(Object.isFrozen(config.limits)).toBe(true)
  })
  test('keeps invalid secret values out of diagnostics', async () => {
    try {
      await loadConfig({ ...env(), MERDECK_TOKEN: 'private-secret' })
    }
    catch (error) {
      expect(String(error)).toContain('MERDECK_TOKEN')
      expect(String(error)).not.toContain('private-secret')
    }
  })
  test('accepts explicit origins and IPv6 defaults', async () => {
    expect((await loadConfig({ ...env(), MERDECK_HOST: '::1' })).allowedOrigins).toEqual(['http://[::1]:8787'])
    expect((await loadConfig({ ...env(), MERDECK_HOST: '0.0.0.0', MERDECK_ALLOWED_ORIGINS: 'https://example.test,https://other.test' })).allowedOrigins).toHaveLength(2)
  })
  test('only permits prefix stripping in explicit development mode', async () => {
    await expect(loadConfig({ ...env(), MERDECK_API_MODE: 'stripped' })).rejects.toThrow('NODE_ENV=development')
    expect((await loadConfig({ ...env(), MERDECK_API_MODE: 'stripped', NODE_ENV: 'development' })).apiBasePath).toBe('/')
  })
})

describe('public API mount contract', () => {
  test('production exposes /api/health and keeps API misses JSON', async () => {
    const app = await appFor(env())
    const response = await app.request('http://127.0.0.1:8787/api/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, data: { status: 'ok', service: 'merdeck' } })
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    for (const path of ['/health', '/api/missing', '/api', '/']) {
      const missing = await app.request(`http://127.0.0.1:8787${path}`)
      expect(missing.status).toBe(404)
      expect(await missing.json()).toMatchObject({ success: false, error: { code: 'not_found' } })
    }
  })
  test('maps domain and internal exceptions without private details', async () => {
    const app = await appFor(env())
    app.get('/api/domain-error', () => {
      throw new AppError('conflict', 'a'.repeat(64))
    })
    app.get('/api/internal-error', () => {
      throw new Error('/private/path token')
    })
    const conflict = await app.request('http://127.0.0.1:8787/api/domain-error')
    expect(conflict.status).toBe(409)
    expect(await conflict.json()).toMatchObject({ success: false, error: { code: 'conflict' } })
    const internal = await app.request('http://127.0.0.1:8787/api/internal-error')
    expect(internal.status).toBe(500)
    expect(await internal.text()).not.toContain('/private/path')
  })
  test('prefix-stripped development has the same health payload', async () => {
    const app = await appFor({ ...env(), NODE_ENV: 'development', MERDECK_API_MODE: 'stripped' })
    expect((await app.request('http://127.0.0.1:8787/health')).status).toBe(200)
    expect((await app.request('http://127.0.0.1:8787/api/health')).status).toBe(404)
  })
})
