import { beforeEach, expect, it } from 'vitest'
import { boundedWidth, explorerWidth } from './explorer-width'

beforeEach(() => localStorage.clear())

it('keeps the explorer width inside its bounds', () => {
  expect(boundedWidth(300)).toBe(300)
  expect(boundedWidth(0)).toBe(explorerWidth.minimum)
  expect(boundedWidth(-40)).toBe(explorerWidth.minimum)
  expect(boundedWidth(4000)).toBe(explorerWidth.maximum)
  expect(boundedWidth(232.4)).toBe(232)
})
