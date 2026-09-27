import { expect, test } from 'bun:test'
import { z } from 'zod'
import { AppError } from '../../../src/shared/errors'
import { jsonInput } from '../../../src/shared/lib/http-input'

const schema = z.strictObject({ source: z.string() })
const headers = { 'Content-Type': 'application/json' }

test('streamed bodies enforce byte bounds without Content-Length and cancel the stream', async () => {
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(100))
    },
    cancel() {
      cancelled = true
      throw new Error('Cancellation failure')
    },
  })
  const request = new Request('http://127.0.0.1/source', { method: 'PUT', headers, body: stream })
  await expect(jsonInput(request, 10, schema)).rejects.toEqual(new AppError('too_large'))
  expect(cancelled).toBe(true)
})

test('a stalled request body has a bounded deadline and is cancelled', async () => {
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true
    },
  })
  const request = new Request('http://127.0.0.1/source', { method: 'PUT', headers, body: stream })
  await expect(jsonInput(request, 4096, schema)).rejects.toEqual(new AppError('invalid_request'))
  expect(cancelled).toBe(true)
}, 15000)
