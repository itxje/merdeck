import { expect, it, vi } from 'vitest'
import { HttpError, requestApi } from './http'

const decode = (data: unknown) => data
function respond(body: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', mock)
  return mock
}
it('uses same-origin API and caller cancellation without credential storage', async () => {
  const fetch = respond({ success: true, data: { authenticated: false } })
  const controller = new AbortController()
  expect(await requestApi('/session', decode, { signal: controller.signal })).toEqual({ authenticated: false })
  expect(fetch).toHaveBeenCalledWith('/api/session', expect.objectContaining({ method: 'GET', credentials: 'same-origin', cache: 'no-store' }))
})
it('serializes mutations with an explicit CSRF header', async () => {
  const fetch = respond({ success: true, data: {} })
  await requestApi('/diagrams/source', decode, { method: 'PUT', csrfToken: 'test-csrf', body: { source: 'A' } })
  const options = fetch.mock.calls[0]?.[1] as RequestInit
  expect((options.headers as Headers).get('X-CSRF-Token')).toBe('test-csrf')
  expect(options.body).toBe('{"source":"A"}')
})
it('preserves error codes and rejects malformed envelopes', async () => {
  respond({ success: false, error: { code: 'conflict', message: 'Reload before saving.' } }, 409)
  await expect(requestApi('/diagrams/source', decode)).rejects.toMatchObject({ code: 'conflict', status: 409 })
  for (const value of [null, {}, { success: true }, { success: false }, { success: false, error: { code: 1 } }]) {
    respond(value)
    await expect(requestApi('/session', decode)).rejects.toBeInstanceOf(HttpError)
  }
})
it('rejects non-relative request paths before fetching', async () => {
  const fetch = respond({ success: true, data: {} })
  for (const path of ['https://example.test', '//example.test'])
    await expect(requestApi(path, decode)).rejects.toThrow('single slash')
  expect(fetch).not.toHaveBeenCalled()
})
