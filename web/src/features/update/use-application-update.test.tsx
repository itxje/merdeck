import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { requestApi } from '@/shared/lib/http'
import { decodeBuild, loadedBuild, useApplicationUpdate } from './use-application-update'

vi.mock('@/shared/lib/http', () => ({ requestApi: vi.fn() }))
const a = 'a'.repeat(64)
const b = 'b'.repeat(64)
const response = (identity: string | null) => ({ identity, pollIntervalMs: 60000 })
function prepare() {
  vi.useFakeTimers()
  document.head.insertAdjacentHTML('beforeend', `<meta name="merdeck-build" content="${a}">`)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  vi.mocked(requestApi).mockReset().mockResolvedValue(response(a))
}
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1)
  })
}
afterEach(() => {
  document.querySelector('meta[name="merdeck-build"]')?.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
it('validates loaded and deployed identities and never checks without a loaded build', async () => {
  expect(loadedBuild()).toBeNull()
  const { unmount } = renderHook(useApplicationUpdate)
  expect(requestApi).not.toHaveBeenCalled()
  unmount()
  for (const input of [{ identity: 'invalid', pollIntervalMs: 60000 }, {}, { identity: a, pollIntervalMs: 1 }, null])
    expect(() => decodeBuild(input)).toThrow()
  expect(decodeBuild(response(null))).toEqual(response(null))
  prepare()
  expect(loadedBuild()).toBe(a)
  vi.mocked(requestApi).mockResolvedValue(response(b))
  const hook = renderHook(useApplicationUpdate)
  await settle()
  expect(hook.result.current.available).toBe(true)
  hook.unmount()
})
it('checks at a bounded cadence, coalesces pending checks and pauses while hidden or offline', async () => {
  prepare()
  let complete: (value: ReturnType<typeof response>) => void = () => {}
  vi.mocked(requestApi).mockImplementationOnce(() => new Promise((resolve) => {
    complete = resolve
  }))
  const { result, unmount } = renderHook(useApplicationUpdate)
  expect(requestApi).toHaveBeenCalledTimes(1)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000)
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('online'))
  })
  expect(requestApi).toHaveBeenCalledTimes(1)
  await act(async () => {
    complete(response(a))
  })
  await settle()
  expect(result.current.available).toBe(false)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000)
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(requestApi).toHaveBeenCalledTimes(1)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(requestApi).toHaveBeenCalledTimes(1)
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  act(() => window.dispatchEvent(new Event('online')))
  await settle()
  expect(requestApi).toHaveBeenCalledTimes(2)
  act(() => window.dispatchEvent(new Event('focus')))
  expect(requestApi).toHaveBeenCalledTimes(2)
  unmount()
  await vi.advanceTimersByTimeAsync(120000)
  expect(requestApi).toHaveBeenCalledTimes(2)
})
it('keeps a detected update through failures, dismisses that identity and notices a later deployment', async () => {
  prepare()
  const { result, unmount } = renderHook(useApplicationUpdate)
  await settle()
  vi.mocked(requestApi).mockResolvedValue(response(b))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000)
  })
  expect(result.current.available).toBe(true)
  vi.mocked(requestApi).mockRejectedValue(new Error('Unavailable'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000)
  })
  expect(result.current.available).toBe(true)
  expect(result.current.failed).toBe(true)
  act(() => result.current.dismiss())
  expect(result.current.available).toBe(false)
  vi.mocked(requestApi).mockResolvedValue(response(b))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000)
  })
  expect(result.current.available).toBe(false)
  vi.mocked(requestApi).mockResolvedValue(response('c'.repeat(64)))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000)
  })
  expect(result.current.available).toBe(true)
  unmount()
})
