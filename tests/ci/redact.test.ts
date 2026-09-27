import { expect, test } from 'bun:test'
import { redactedOutput } from '../../scripts/ci/redact'

test('verification pipes redact credentials across stream boundaries and final partial lines', async () => {
  const encoder = new TextEncoder()
  const secret = 'synthetic-private-token'
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of ['failure: synthetic-pri', 'vate-token\nnext synthetic-', 'private-token'])
        controller.enqueue(encoder.encode(part))
      controller.close()
    },
  })
  let output = ''
  await redactedOutput(stream, [secret], (text) => {
    output += text
  })
  expect(output).toBe('failure: <redacted>\nnext <redacted>')
  expect(output).not.toContain(secret)
})
