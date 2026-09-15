import type { DiagramBlock } from '../../../../src/shared/contracts'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { DocumentView } from './document-view'

vi.mock('@/features/preview/renderer', () => ({ renderDiagram: vi.fn().mockResolvedValue('<svg><text>diagram</text></svg>') }))
const blocks: DiagramBlock[] = [{ selector: { kind: 'markdown', id: 'md:0:20:30' }, label: 'Diagram 1', lineStart: 8, lineEnd: 9, source: 'flowchart LR\nA-->B' }]
it('renders safe Markdown as React elements and places matching diagrams', async () => {
  const open = vi.fn()
  const select = vi.fn()
  render(<DocumentView path="docs/guide.md" text={'# Title\n\n<script>alert(1)</script>\n\n![remote](https://bad.example/i.png)\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n[Next](next.md)'} blocks={blocks} sources={blocks.map(block => block.source)} selected={0} onSelect={select} onOpenFile={open} />)
  expect(screen.getByRole('heading', { name: 'Title' })).toBeVisible()
  expect(screen.queryByRole('script')).toBeNull()
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText(/Image:\s*remote/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(open).toHaveBeenCalledWith('docs/next.md')
  await waitFor(() => expect(screen.getByText('diagram')).toBeVisible())
})

it('keeps unsafe targets inert, supports GFM prose, and visibly falls back on fence mismatch', () => {
  render(<DocumentView path="docs/guide.md" text={'---\ntitle: ignored\n---\n\n- [x] task\n\n| A | B |\n| :- | -: |\n| 1 | 2 |\n\n[bad](javascript:alert(1)) [root](/secret.md) [mail](mailto:hello@example.test)\n\n```mermaid\nA-->B\n```'} blocks={[{ ...blocks[0]!, lineStart: 1, lineEnd: 1 }]} sources={['A-->B']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(screen.getByRole('checkbox')).toBeChecked()
  expect(screen.getByRole('link', { name: 'mail' })).toHaveAttribute('rel', 'noopener noreferrer')
  expect(screen.queryByRole('link', { name: 'bad' })).toBeNull()
  expect(screen.getByRole('alert')).toHaveTextContent('placement could not be verified')
  expect(screen.getByText('A-->B')).toBeVisible()
})
