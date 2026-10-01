import { expect, it, vi } from 'vitest'
import { api, decodeFileLocation } from './api'

it('accepts exact absolute paths with spaces and Unicode file names', () => {
  const location = { path: 'docs/流程 guide.md', absolutePath: '/project root/docs/流程 guide.md' }
  expect(decodeFileLocation(location)).toEqual(location)
  expect(decodeFileLocation({ path: 'one.mmd', absolutePath: '/one.mmd' })).toEqual({ path: 'one.mmd', absolutePath: '/one.mmd' })
})

it.each([
  { path: 'one.mmd', absolutePath: 'project/one.mmd' },
  { path: 'one.mmd', absolutePath: '/project/two.mmd' },
  { path: 'one.mmd', absolutePath: '/project/../one.mmd' },
  { path: 'one.mmd', absolutePath: '//project/one.mmd' },
  { path: 'one.mmd', absolutePath: '/project\0/one.mmd' },
  { path: '../one.mmd', absolutePath: '/project/../one.mmd' },
  { path: 'one.mmd' },
  { path: 'one.mmd', absolutePath: '/project/one.mmd', extra: true },
])('rejects an unusable or inconsistent server location: %j', (value) => {
  expect(() => decodeFileLocation(value)).toThrow('The service returned an invalid response.')
})

it('encodes the selected file and refuses another file returned by the server', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { path: 'two.md', absolutePath: '/project/two.md' } })))
  vi.stubGlobal('fetch', fetch)
  await expect(api.fileLocation('docs/流程 guide.md', new AbortController().signal)).rejects.toThrow('The service returned an invalid response.')
  expect(fetch.mock.calls[0]?.[0]).toBe(`/api/diagrams/location?path=${encodeURIComponent('docs/流程 guide.md')}`)
})
