import { describe, expect, test } from 'bun:test'
import { readJsonLines } from './process'

function bytes(...chunks: number[][]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks)
        controller.enqueue(Uint8Array.from(chunk))
      controller.close()
    },
  })
}

describe('provider JSONL boundary', () => {
  test('accepts split UTF-8, CRLF and one final unterminated value', async () => {
    const values: unknown[] = []
    const encoded = new TextEncoder().encode('{"text":"safe ✓"}\r\n{"done":true}')
    await readJsonLines(bytes([...encoded.slice(0, 10)], [...encoded.slice(10)]), value => values.push(value))
    expect(values).toEqual([{ text: 'safe ✓' }, { done: true }])
  })

  test('rejects malformed JSON, fatal UTF-8 and oversized lines', async () => {
    await expect(readJsonLines(bytes([...new TextEncoder().encode('{bad}\n')]), () => {})).rejects.toThrow()
    await expect(readJsonLines(bytes([0x7B, 0x22, 0x78, 0x22, 0x3A, 0x22, 0xC3, 0x28, 0x22, 0x7D]), () => {})).rejects.toThrow()
    await expect(readJsonLines(bytes([...new TextEncoder().encode(`{"x":"${'a'.repeat(64)}"}\n`)]), () => {}, 32)).rejects.toThrow('too large')
  })
})
