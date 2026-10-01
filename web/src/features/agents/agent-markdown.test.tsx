import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { AgentMarkdown } from './agent-markdown'

it('copies the displayed code exactly, including an unfinished streaming fence', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  const view = render(<AgentMarkdown text={'```ts\nconst answer = 42'} />)
  await user.click(screen.getByRole('button', { name: 'Copy code' }))
  expect(writeText).toHaveBeenCalledWith('const answer = 42')
  expect(await screen.findByText('Copied')).toBeVisible()
  view.rerender(<AgentMarkdown text={'```ts\nconst answer = 42\nanswer += 1\n```'} />)
  await user.click(screen.getByRole('button', { name: 'Copy code' }))
  expect(writeText).toHaveBeenLastCalledWith('const answer = 42\nanswer += 1')
})

it('exposes clipboard refusal and leaves code available to select', async () => {
  const user = userEvent.setup()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
  render(<AgentMarkdown text={'```\ncopy me\n```'} />)
  await user.click(screen.getByRole('button', { name: 'Copy code' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Copy failed')
  expect(screen.getByText('copy me')).toBeVisible()
})

it('formats lists and tables while admitting only validated external links', () => {
  const text = '- **Bold** and _italic_\n- [x] Finished\n\n1. Ordered\n\n> Quote\n\n| Column | Value |\n| --- | --- |\n| Label | `code` |\n\n[Site](https://example.com) [Mail](mailto:owner@example.com) [relative](guide.md) [unsafe](javascript:alert(1)) [reference][site]\n\n[site]: https://example.org\n\n![Image](https://example.com/image.png)\n\n<img src=x onerror=alert(1)>'
  const view = render(<AgentMarkdown text={text} />)
  expect(screen.getByRole('table')).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'Column' })).toBeVisible()
  expect(screen.getByRole('checkbox')).toBeChecked()
  expect(screen.getByText('Bold').tagName).toBe('STRONG')
  expect(screen.getByText('italic').tagName).toBe('EM')
  for (const name of ['Site', 'Mail', 'reference']) {
    const link = screen.getByRole('link', { name })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('referrerpolicy', 'no-referrer')
  }
  expect(screen.queryByRole('link', { name: 'relative' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'unsafe' })).toBeNull()
  expect(view.container.querySelector('img')).toBeNull()
})
