import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { DocumentView } from './document-view'

vi.mock('@/features/preview/renderer', () => ({ renderDiagram: vi.fn().mockResolvedValue('<svg><text>diagram</text></svg>') }))
const blocks = [{ selector: { kind: 'markdown' as const, id: 'md:0:20:30' }, label: 'Diagram 1', lineStart: 8, lineEnd: 9, source: 'flowchart LR\nA-->B' }]
it('renders safe Markdown as React elements and places matching diagrams', async () => {
  const open = vi.fn()
  const select = vi.fn()
  render(<DocumentView path="docs/guide.md" text={'# Title\n\n<script>alert(1)</script>\n\n![remote](https://bad.example/i.png)\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n[Next](next.md)'} blocks={blocks} sources={blocks.map(block => block.source)} selected={0} onSelect={select} onOpenFile={open} />)
  expect(screen.getByRole('heading', { name: 'Title' })).toBeVisible()
  expect(screen.queryByRole('script')).toBeNull()
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText(/Image: remote/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(open).toHaveBeenCalledWith('docs/next.md')
  await waitFor(() => expect(screen.getByText('diagram')).toBeVisible())
})
