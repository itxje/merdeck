import type { Session } from './api'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { createQueryClient } from '@/shared/lib/query'
import { api } from './api'
import { FilePathCopy } from './file-path-copy'

const session: Session = { authenticated: true, access: 'open', version: 'test', pollIntervalMs: 3000, maxSourceBytes: 1024, storage: { writable: true, identity: 'stable', filesystemType: 'test', supportedFilesystem: 'test' } }

it('waits for the exact server location and exposes clipboard failure without reporting success', async () => {
  let finish = () => {}
  vi.spyOn(api, 'fileLocation').mockImplementation(path => new Promise((resolve) => {
    finish = () => resolve({ path, absolutePath: `/project/${path}` })
  }))
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Permission denied'))
  const client = createQueryClient()
  const view = render(<QueryClientProvider client={client}><FilePathCopy path="one.mmd" session={session} /></QueryClientProvider>)
  const button = screen.getByRole('button', { name: 'Copy absolute path' })
  expect(button).toBeDisabled()
  await act(async () => finish())
  await waitFor(() => expect(button).toBeEnabled())
  await user.click(button)
  expect(await screen.findByText('Copy failed')).toHaveAttribute('role', 'status')
  expect(screen.queryByText('Path copied')).toBeNull()
  expect(writeText).toHaveBeenCalledWith('/project/one.mmd')
  await waitFor(() => expect(button).toBeEnabled())
  view.unmount()
  client.clear()
})

it('uses the newly selected file and never shows an old clipboard completion for it', async () => {
  vi.spyOn(api, 'fileLocation').mockImplementation(async path => ({ path, absolutePath: `/project/${path}` }))
  let finish = () => {}
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(() => new Promise<void>((resolve) => {
    finish = resolve
  }))
  const client = createQueryClient()
  const content = (path: string) => <QueryClientProvider client={client}><FilePathCopy key={path} path={path} session={session} /></QueryClientProvider>
  const view = render(content('one.mmd'))
  const button = screen.getByRole('button', { name: 'Copy absolute path' })
  await waitFor(() => expect(button).toBeEnabled())
  await user.click(button)
  expect(button).toBeDisabled()
  expect(writeText).toHaveBeenLastCalledWith('/project/one.mmd')
  view.rerender(content('nested/two.md'))
  await act(async () => finish())
  expect(screen.queryByText('Path copied')).toBeNull()
  const next = screen.getByRole('button', { name: 'Copy absolute path' })
  await waitFor(() => expect(next).toBeEnabled())
  writeText.mockResolvedValue()
  await user.click(next)
  expect(writeText).toHaveBeenLastCalledWith('/project/nested/two.md')
  expect(await screen.findByText('Path copied')).toHaveAttribute('role', 'status')
  view.unmount()
  client.clear()
})

it('keeps failed server locations unavailable for copying', async () => {
  vi.spyOn(api, 'fileLocation').mockRejectedValue(new Error('Unavailable'))
  const client = createQueryClient()
  const view = render(<QueryClientProvider client={client}><FilePathCopy path="one.mmd" session={session} /></QueryClientProvider>)
  expect(await screen.findByText('File path unavailable')).toHaveAttribute('role', 'status')
  expect(screen.getByRole('button', { name: 'Copy absolute path' })).toBeDisabled()
  view.unmount()
  client.clear()
})
