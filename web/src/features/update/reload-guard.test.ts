import type { FileDraft } from '@/features/workspace/drafts'
import { expect, it } from 'vitest'
import { protectedWork } from './reload-guard'

const clean: FileDraft = { baseline: { path: 'sibling.md', version: 'a'.repeat(64), kind: 'markdown', blocks: [{ selector: { kind: 'standalone' }, label: 'Diagram', source: 'A-->B', lineStart: 1, lineEnd: 2 }] }, sources: ['A-->B'], warning: null, locked: false, saving: null, saved: false }
it('protects clean-looking sibling files with locks, warnings, pending saves or retained blocks', () => {
  expect(protectedWork({})).toBe(false)
  expect(protectedWork({ sibling: clean })).toBe(false)
  for (const file of [
    { ...clean, sources: ['Unsaved'] },
    { ...clean, locked: true },
    { ...clean, warning: { kind: 'deleted' as const } },
    { ...clean, warning: { kind: 'layout' as const } },
    { ...clean, warning: { kind: 'mutation' as const, message: 'Save failed' } },
    { ...clean, saving: { id: 1, block: 0, source: 'A-->B', version: clean.baseline.version } },
    { ...clean, sources: ['A-->B', 'Retained missing block'] },
  ])
    expect(protectedWork({ selected: clean, sibling: file })).toBe(true)
})
