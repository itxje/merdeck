import { expect, it } from 'vitest'
import { textChunks } from './markdown-text'

it('keeps an astral character whole at the deferred-text boundary', () => {
  const value = `${'x'.repeat(4095)}😀 tail`
  const chunks = textChunks(value)
  expect(chunks).toEqual([`${'x'.repeat(4095)}`, '😀 tail'])
  expect(chunks.join('')).toBe(value)
  expect(chunks.every(chunk => !/[\uD800-\uDBFF]$/.test(chunk) && !/^[\uDC00-\uDFFF]/.test(chunk))).toBe(true)
})
