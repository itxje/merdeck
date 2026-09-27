import { expect, test } from 'bun:test'
import { fixturePages, fixtureSources, loadedRows, visibleRows } from './directory-model'

test('retains only five pages while reporting absolute page ranges', () => {
  const rows = loadedRows('archive', 6)
  expect(rows).toHaveLength(15)
  expect(rows.some(row => row.name === 'diagram-01.mmd')).toBe(false)
  expect(rows.some(row => row.name === 'diagram-18.mmd')).toBe(true)
})

test('file filters and search never remove folders with unloaded descendants', () => {
  expect(visibleRows(loadedRows('', 1), 'no-match', 'markdown').map(row => row.name)).toEqual(['docs', 'archive', 'empty'])
})

test('empty fixture is distinct from a page window without matching files', () => {
  expect(fixturePages('empty')).toEqual([[]])
  expect(fixturePages('archive').length).toBe(7)
})

test('deferred documents distinguish zero blocks, Markdown blocks and standalone source', () => {
  expect(fixtureSources('docs/notes.md')).toEqual([])
  expect(fixtureSources('docs/guide.md')).toHaveLength(2)
  expect(fixtureSources('overview.mmd')[0]).toContain('flowchart TD')
  expect(fixturePages('docs/platform')[0]?.[0]?.name).toBe('deployment.mmd')
  expect(fixturePages('docs')[0]?.some(row => row.name === 'unreadable.md')).toBe(true)
})
