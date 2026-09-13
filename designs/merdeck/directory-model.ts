export interface FixtureRow { name: string, folder?: boolean, markdown?: boolean }
const folder = (name: string): FixtureRow => ({ name, folder: true })
const file = (name: string): FixtureRow => ({ name, markdown: name.endsWith('.md') })
export function fixturePages(directory: string): FixtureRow[][] {
  switch (directory) {
    case '': return [[folder('docs'), folder('archive'), folder('empty'), file('overview.mmd'), file('README.md')]]
    case 'docs': return [[folder('platform'), file('architecture.mmd'), file('guide.md'), file('notes.md'), file('unreadable.md')]]
    case 'docs/platform': return [[file('deployment.mmd')]]
    case 'archive': return Array.from({ length: 7 }, (_, page) => Array.from({ length: 3 }, (_, index) => file(`diagram-${String(page * 3 + index + 1).padStart(2, '0')}.mmd`)))
    default: return [[]]
  }
}
export function loadedRows(directory: string, page: number): FixtureRow[] {
  return fixturePages(directory).slice(Math.max(0, page - 5), page).flat()
}
export function visibleRows(rows: FixtureRow[], search: string, kind: string): FixtureRow[] {
  return rows.filter(row => row.folder || ((kind === 'all' || (kind === 'markdown') === !!row.markdown) && row.name.toLowerCase().includes(search.toLowerCase())))
}
export const overview = 'flowchart TD\n  A[Project overview] --> B[Architecture]\n  A --> C[Release checklist]\n  B --> D[Ready to build]\n  C --> D\n'
export function fixtureSources(path: string): string[] {
  if (path.endsWith('notes.md'))
    return []
  if (path.endsWith('.md'))
    return ['flowchart LR\n  A[Read the guide] --> B[Explore diagrams]\n', 'sequenceDiagram\n  Editor->>Project: Save diagram\n  Project-->>Editor: Version confirmed\n']
  return [overview]
}
