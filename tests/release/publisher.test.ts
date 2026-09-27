import type { Transport } from '../../scripts/release/publisher'
import { rm } from 'node:fs/promises'
import { expect, test } from 'bun:test'
import { sha256 } from '../../scripts/release/manifest'
import { publishRelease } from '../../scripts/release/publisher'
import { bundleFixture, fixtureCommit, fixtureTag } from './fixtures'

function mockTransport() {
  let release: Record<string, unknown> | null = null
  const assets: { id: number, name: string, size: number, digest: string, state: string }[] = []
  const calls: string[] = []
  let failUpload = false
  let wrongCommit = false
  const transport: Transport = async (path, method = 'GET', data) => {
    calls.push(`${method} ${path}`)
    if (path.startsWith('/git/ref/'))
      return { object: { type: 'commit', sha: wrongCommit ? 'b'.repeat(40) : fixtureCommit } }
    if (path.startsWith('/releases?'))
      return release ? [release] : []
    if (path === '/releases/generate-notes')
      return { body: 'Synthetic changes' }
    if (path === '/releases' && method === 'POST') {
      release = { id: 1, ...data as Record<string, unknown> }
      return release
    }
    if (path === '/releases/1/assets?per_page=100')
      return assets
    if (method === 'UPLOAD') {
      if (failUpload && assets.length === 1)
        throw new Error('Synthetic upload failure')
      const bytes = data as Uint8Array
      assets.push({ id: assets.length + 1, name: new URL(`https://example.invalid${path}`).searchParams.get('name')!, size: bytes.byteLength, digest: `sha256:${sha256(bytes)}`, state: 'uploaded' })
      return assets.at(-1)
    }
    if (path === '/releases/1' && method === 'PATCH') {
      release = { ...release, ...data as Record<string, unknown> }
      return release
    }
    throw new Error(`Unexpected mock endpoint: ${method} ${path}`)
  }
  return {
    transport,
    calls,
    assets,
    fail: () => { failUpload = true },
    recover: () => { failUpload = false },
    wrong: () => { wrongCommit = true },
    release: () => release,
  }
}

test('draft remains private on failed upload and resumes idempotently before publication', async () => {
  const { directory } = await bundleFixture()
  const mock = mockTransport()
  try {
    mock.fail()
    await expect(publishRelease(directory, fixtureTag, fixtureCommit, mock.transport)).rejects.toThrow('upload failure')
    expect(mock.release()?.draft).toBe(true)
    expect(mock.calls.filter(call => call.startsWith('PATCH'))).toHaveLength(0)
    mock.recover()
    expect((await publishRelease(directory, fixtureTag, fixtureCommit, mock.transport)).assets).toHaveLength(2)
    expect(mock.release()?.draft).toBe(false)
    const mutations = mock.calls.filter(call => !call.startsWith('GET')).length
    expect((await publishRelease(directory, fixtureTag, fixtureCommit, mock.transport)).reused).toBe(true)
    expect(mock.calls.filter(call => !call.startsWith('GET')).length).toBe(mutations)
    expect(mock.calls.some(call => call.startsWith('DELETE'))).toBe(false)
    mock.assets[0]!.digest = `sha256:${'0'.repeat(64)}`
    await expect(publishRelease(directory, fixtureTag, fixtureCommit, mock.transport)).rejects.toThrow('asset mismatch')
  }
  finally { await rm(directory, { recursive: true, force: true }) }
})

test('tag movement and unrelated existing release assets refuse mutation', async () => {
  const { directory } = await bundleFixture()
  const mock = mockTransport()
  try {
    await publishRelease(directory, fixtureTag, fixtureCommit, mock.transport)
    mock.assets.push({ id: 99, name: 'unrelated', size: 0, digest: '', state: 'uploaded' })
    await expect(publishRelease(directory, fixtureTag, fixtureCommit, mock.transport)).rejects.toThrow('unrelated')
    mock.wrong()
    await expect(publishRelease(directory, fixtureTag, fixtureCommit, mock.transport)).rejects.toThrow('checked commit')
    expect(mock.calls.some(call => call.startsWith('DELETE'))).toBe(false)
  }
  finally { await rm(directory, { recursive: true, force: true }) }
})
